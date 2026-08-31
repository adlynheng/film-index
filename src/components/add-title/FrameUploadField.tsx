"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface FrameUploadFieldProps {
  // The file this reports is the one to upload: the original while untouched,
  // and the rendered crop once the frame has been repositioned or zoomed.
  onFrameChange: (file: File | null) => void;
}

// Zoom is relative to a cover fit, so 1 is "fills the 16:9 box exactly" and the
// frame can never be pulled small enough to show bars behind it.
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
// The widest rung of the stored ladder (frameWidths.ts); cropping should never
// hand the server more pixels than it keeps, nor upscale to reach it.
const MAX_EXPORT_WIDTH = 1280;
const EXPORT_QUALITY = 0.92;

interface Size {
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function FrameUploadField({ onFrameChange }: FrameUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [boxSize, setBoxSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);

  // An object URL pins its blob in memory until it is revoked, and picking a
  // second frame replaces the first — so each URL is released when it stops
  // being the current one, and on unmount.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setBoxSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [previewUrl]);

  /**
   * The frame's geometry, in one place because the preview and the exported
   * crop have to agree exactly: what the box shows is what the canvas draws.
   * `baseScale` is the cover fit, everything else follows from it.
   */
  const layout = (() => {
    if (!naturalSize || boxSize.width === 0 || boxSize.height === 0) return null;
    const baseScale = Math.max(boxSize.width / naturalSize.width, boxSize.height / naturalSize.height);
    const scale = baseScale * zoom;
    const drawnWidth = naturalSize.width * scale;
    const drawnHeight = naturalSize.height * scale;
    // Clamped rather than stored clamped: the limit moves with the zoom, so a
    // pan that was legal at 3x has to be reined in when zooming back to 1x.
    const limitX = Math.max(0, (drawnWidth - boxSize.width) / 2);
    const limitY = Math.max(0, (drawnHeight - boxSize.height) / 2);
    const x = clamp(offset.x, -limitX, limitX);
    const y = clamp(offset.y, -limitY, limitY);
    return {
      scale,
      drawnWidth,
      drawnHeight,
      left: (boxSize.width - drawnWidth) / 2 + x,
      top: (boxSize.height - drawnHeight) / 2 + y,
    };
  })();

  /** Renders the visible region to a canvas and reports it as the frame to upload. */
  const commitCrop = useCallback(() => {
    const image = imageRef.current;
    if (!image || !layout || !originalFile || !naturalSize) return;

    const sourceWidth = boxSize.width / layout.scale;
    const sourceHeight = boxSize.height / layout.scale;
    const sourceX = -layout.left / layout.scale;
    const sourceY = -layout.top / layout.scale;

    // Never upscale: a crop of a small source stays at its own resolution and
    // the ladder's withoutEnlargement handles the rest.
    const exportWidth = Math.max(1, Math.min(MAX_EXPORT_WIDTH, Math.round(sourceWidth)));
    const exportHeight = Math.max(1, Math.round((exportWidth * boxSize.height) / boxSize.width));

    const canvas = document.createElement("canvas");
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, exportWidth, exportHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const name = originalFile.name.replace(/\.[^.]+$/, "");
        onFrameChange(new File([blob], `${name}-crop.webp`, { type: blob.type }));
      },
      "image/webp",
      EXPORT_QUALITY
    );
  }, [boxSize.height, boxSize.width, layout, naturalSize, onFrameChange, originalFile]);

  // Wheel has to be bound by hand: React attaches its own wheel listener
  // passively, so an onWheel prop cannot preventDefault — and without that the
  // dialog scrolls away under the frame being zoomed.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !isCropping) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => clamp(current * Math.exp(-event.deltaY / 400), MIN_ZOOM, MAX_ZOOM));
    };
    box.addEventListener("wheel", handleWheel, { passive: false });
    return () => box.removeEventListener("wheel", handleWheel);
  }, [isCropping]);

  // commitCrop closes over the geometry, so it is a new function on every
  // render; the debounce below must not depend on it. Reporting a crop sets
  // state in the dialog, which re-renders this field — a commitCrop dependency
  // would make that re-render schedule another commit, forever.
  const commitCropRef = useRef(commitCrop);
  useEffect(() => {
    commitCropRef.current = commitCrop;
  }, [commitCrop]);

  // One commit after the gesture settles rather than one per frame: encoding a
  // 1280-wide WebP on every wheel tick would stutter the drag.
  useEffect(() => {
    if (!isCropping) return;
    const timer = setTimeout(() => commitCropRef.current(), 180);
    return () => clearTimeout(timer);
  }, [isCropping, zoom, offset.x, offset.y]);

  function loadFile(file: File) {
    setOriginalFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNaturalSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsCropping(false);
    // Untouched frames upload exactly as they arrived — the crop only replaces
    // the file once the reader has actually reframed something.
    onFrameChange(file);
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isCropping || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: layout ? layout.left + layout.drawnWidth / 2 - boxSize.width / 2 : offset.x,
      originY: layout ? layout.top + layout.drawnHeight / 2 - boxSize.height / 2 : offset.y,
    };
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <div className="mt-[10px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          if (selectedFile) loadFile(selectedFile);
        }}
      />

      <div
        ref={boxRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const droppedFile = event.dataTransfer.files[0];
          if (droppedFile) loadFile(droppedFile);
        }}
        onPointerDown={startDrag}
        onPointerMove={continueDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (!previewUrl) inputRef.current?.click();
        }}
        className={`relative aspect-video w-full overflow-hidden border border-dashed border-borderDashed bg-tile ${
          isCropping ? "cursor-grab touch-none active:cursor-grabbing" : previewUrl ? "" : "cursor-pointer"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL, not an R2 asset
          <img
            ref={imageRef}
            src={previewUrl}
            alt=""
            draggable={false}
            onLoad={(event) =>
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            // Positioned rather than object-cover: the crop maths needs the
            // drawn box in numbers it can hand to drawImage.
            style={
              layout
                ? {
                    position: "absolute",
                    width: `${layout.drawnWidth}px`,
                    height: `${layout.drawnHeight}px`,
                    left: `${layout.left}px`,
                    top: `${layout.top}px`,
                    maxWidth: "none",
                  }
                : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[13px] text-muted">
            Drop a frame, or click to browse
          </div>
        )}
      </div>

      <div className="mt-[10px] flex flex-wrap items-center justify-between gap-[10px]">
        <span className="text-[12.5px] text-muted">
          {isCropping
            ? "Drag to reposition, scroll or use the slider to resize."
            : previewUrl
              ? "Saved at 16:9, exactly as framed here."
              : "A 16:9 frame reads best — anything wider will be cropped to fit."}
        </span>

        <div className="flex flex-wrap items-center gap-[10px]">
          {isCropping ? (
            <>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                aria-label="Zoom"
                className="w-[120px] cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="cursor-pointer border border-borderStrong bg-transparent px-[14px] py-[8px] font-sans text-[13px] text-ink hover:border-ink"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  commitCrop();
                  setIsCropping(false);
                }}
                className="cursor-pointer rounded-full bg-ink px-[18px] py-[8px] font-sans text-[13px] text-paper"
              >
                Done
              </button>
            </>
          ) : (
            <>
              {previewUrl ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer border-b border-borderStrong bg-transparent p-0 text-[13px] text-body hover:border-ink hover:text-ink"
                >
                  Replace
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => (previewUrl ? setIsCropping(true) : inputRef.current?.click())}
                className="flex cursor-pointer items-center gap-[8px] border border-borderStrong bg-transparent px-[14px] py-[8px] font-sans text-[13px] text-ink hover:border-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
                Crop &amp; resize
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
