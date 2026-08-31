"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

/**
 * A drop-or-browse image field with the reframe interaction from
 * `image-slot.js` in the Claude Design project, reimplemented in React.
 *
 * The view is the design's own model: `{ s, x, y }`, where `s` scales the
 * cover-fit baseline and `x`/`y` offset the image's centre in *percentages of
 * the frame*, not pixels. Percentages are what make a crop survive a resize —
 * the same numbers describe the same framing at any size, which is what lets
 * this component take its dimensions from its container.
 *
 * In reframe mode the full image spills past the frame at 35% opacity with a
 * handle at each of its corners, while the frame keeps showing the opaque
 * crop underneath. There is no zoom slider: scroll, or pull a corner.
 */

// The design's S_MAX: a 5x enlargement of the cover fit.
const MAX_SCALE = 5;
const MIN_SCALE = 1;
// Wheel curve copied from image-slot's `Math.pow(1.0015, -deltaY)`.
const WHEEL_BASE = 1.0015;
// The widest rung of the stored ladder (frameWidths.ts); the crop should never
// hand the server more pixels than it keeps, nor upscale to reach it.
const MAX_EXPORT_WIDTH = 1280;
const EXPORT_QUALITY = 0.92;
const COMMIT_DELAY_MS = 180;

type Corner = "nw" | "ne" | "sw" | "se";

interface View {
  s: number;
  x: number;
  y: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImageCropFieldProps {
  /** Reported whenever the framing settles: the original file until it is reframed, the rendered crop after. */
  onFrameChange: (file: File | null) => void;
  /** Frame shape. 16:9 by default, matching the film frames this index stores. */
  aspectRatio?: number;
  /** Sizing for the frame. Anything goes — the geometry is measured, not assumed. */
  className?: string;
  placeholder?: string;
  /** Cap on the exported crop's width. Never upscales past the source. */
  exportMaxWidth?: number;
}

const clampScale = (scale: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

export function ImageCropField({
  onFrameChange,
  aspectRatio = 16 / 9,
  className = "w-full",
  placeholder = "Drop a frame, or click to browse",
  exportMaxWidth = MAX_EXPORT_WIDTH,
}: ImageCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<((event: { clientX: number; clientY: number }) => void) | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [frameRect, setFrameRect] = useState<Rect | null>(null);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const [isReframing, setIsReframing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // An object URL pins its blob in memory until it is revoked, and picking a
  // second frame replaces the first — so each URL is released when it stops
  // being the current one, and on unmount.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const measure = () => setFrame({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [previewUrl]);

  // The spill is portalled to the body in viewport pixels, so it has to follow
  // the frame when the dialog behind it scrolls or the window resizes — the
  // same job image-slot gives its `_reposition`.
  useEffect(() => {
    const element = frameRef.current;
    if (!element || !isReframing) return;
    const track = () => {
      const box = element.getBoundingClientRect();
      setFrameRect({ left: box.left, top: box.top, width: box.width, height: box.height });
    };
    track();
    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);
    return () => {
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
    };
  }, [isReframing]);

  /**
   * Cover baseline and the drawn box, in frame pixels. `base` is the scale at
   * which the image exactly fills the frame; everything else is `base * s`.
   */
  const geometry = (() => {
    if (!natural || frame.width === 0 || frame.height === 0) return null;
    const base = Math.max(frame.width / natural.width, frame.height / natural.height);
    const scale = base * view.s;
    const drawnWidth = natural.width * scale;
    const drawnHeight = natural.height * scale;
    return {
      base,
      scale,
      drawnWidth,
      drawnHeight,
      centreX: ((50 + view.x) / 100) * frame.width,
      centreY: ((50 + view.y) / 100) * frame.height,
    };
  })();

  /** Pan range on each axis is half the overflow past the frame edge, in frame-%. */
  const clampView = useCallback(
    (next: View): View => {
      if (!natural || frame.width === 0 || frame.height === 0) return next;
      const base = Math.max(frame.width / natural.width, frame.height / natural.height);
      const limitX = Math.max(0, ((natural.width * base * next.s) / frame.width - 1) * 50);
      const limitY = Math.max(0, ((natural.height * base * next.s) / frame.height - 1) * 50);
      return {
        s: next.s,
        x: Math.max(-limitX, Math.min(limitX, next.x)),
        y: Math.max(-limitY, Math.min(limitY, next.y)),
      };
    },
    [frame.height, frame.width, natural]
  );

  /** Renders the framed region to a canvas and reports it as the file to upload. */
  const commitCrop = useCallback(() => {
    const image = imageRef.current;
    if (!image || !geometry || !originalFile) return;

    const sourceWidth = frame.width / geometry.scale;
    const sourceHeight = frame.height / geometry.scale;
    const sourceX = (geometry.drawnWidth / 2 - geometry.centreX) / geometry.scale;
    const sourceY = (geometry.drawnHeight / 2 - geometry.centreY) / geometry.scale;

    // Never upscale: a crop of a small source stays at its own resolution and
    // the ladder's withoutEnlargement handles the rest.
    const width = Math.max(1, Math.min(exportMaxWidth, Math.round(sourceWidth)));
    const height = Math.max(1, Math.round((width * frame.height) / frame.width));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onFrameChange(new File([blob], `${originalFile.name.replace(/\.[^.]+$/, "")}-crop.webp`, { type: blob.type }));
      },
      "image/webp",
      EXPORT_QUALITY
    );
  }, [exportMaxWidth, frame.height, frame.width, geometry, onFrameChange, originalFile]);

  // commitCrop closes over the geometry, so it is a new function on every
  // render; the debounce below must not depend on it. Reporting a crop sets
  // state in the parent, which re-renders this field — a commitCrop
  // dependency would make that re-render schedule another commit, forever.
  const commitCropRef = useRef(commitCrop);
  useEffect(() => {
    commitCropRef.current = commitCrop;
  }, [commitCrop]);

  // One encode after the gesture settles rather than one per frame, so the
  // parent always holds the framing that is on screen even if the dialog is
  // saved without leaving reframe mode.
  useEffect(() => {
    if (!isReframing) return;
    const timer = setTimeout(() => commitCropRef.current(), COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isReframing, view.s, view.x, view.y]);

  const exitReframe = useCallback(() => {
    dragRef.current = null;
    setIsPanning(false);
    setIsReframing(false);
    commitCropRef.current();
  }, []);

  // Escape and click-out commit, as the design's reframe mode does. Escape is
  // taken in the capture phase and stopped: the dialog closes on Escape too,
  // and leaving reframe has to win while it is open.
  useEffect(() => {
    if (!isReframing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      exitReframe();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-crop-surface]")) return;
      exitReframe();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [exitReframe, isReframing]);

  // Wheel zooms toward the cursor: offset' = cursor·(1-k) + offset·k. Bound by
  // hand on both surfaces because React's own wheel listener is passive, so an
  // onWheel prop cannot preventDefault — and without that the dialog scrolls
  // away under the frame being zoomed.
  useEffect(() => {
    if (!isReframing) return;
    const element = frameRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = element.getBoundingClientRect();
      const cursorX = ((event.clientX - box.left) / box.width) * 100 - 50;
      const cursorY = ((event.clientY - box.top) / box.height) * 100 - 50;
      setView((current) => {
        const next = clampScale(current.s * Math.pow(WHEEL_BASE, -event.deltaY));
        if (next === current.s) return current;
        const k = next / current.s;
        return clampView({ s: next, x: cursorX * (1 - k) + current.x * k, y: cursorY * (1 - k) + current.y * k });
      });
    };

    const surfaces = [element, document.querySelector("[data-crop-spill]")].filter(Boolean) as Element[];
    for (const surface of surfaces) surface.addEventListener("wheel", handleWheel as EventListener, { passive: false });
    return () => {
      for (const surface of surfaces) surface.removeEventListener("wheel", handleWheel as EventListener);
    };
  }, [clampView, isReframing, frameRect]);

  function loadFile(file: File) {
    setOriginalFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNatural(null);
    setView({ s: 1, x: 0, y: 0 });
    setIsReframing(false);
    // Untouched frames upload exactly as they arrived — the crop only replaces
    // the file once the framing has actually been changed.
    onFrameChange(file);
  }

  function removeFrame() {
    setOriginalFile(null);
    setPreviewUrl(null);
    setNatural(null);
    setView({ s: 1, x: 0, y: 0 });
    setIsReframing(false);
    onFrameChange(null);
    // Without this the same file picked twice in a row fires no change event.
    if (inputRef.current) inputRef.current.value = "";
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || frame.width === 0) return;
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    setIsPanning(true);
    const start = { pointerX: event.clientX, pointerY: event.clientY, x: view.x, y: view.y };
    dragRef.current = (move) =>
      setView((current) =>
        clampView({
          s: current.s,
          x: start.x + ((move.clientX - start.pointerX) / frame.width) * 100,
          y: start.y + ((move.clientY - start.pointerY) / frame.height) * 100,
        })
      );
  }

  /**
   * Aspect-locked resize anchored at the opposite corner, exactly as
   * image-slot does it: project the pointer onto the image's diagonal and read
   * the new scale off that projection, then recentre so the anchored corner
   * has not moved.
   */
  function startResize(event: ReactPointerEvent<HTMLDivElement>, corner: Corner) {
    if (event.button !== 0 || !geometry || !frameRect) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);

    const signX = corner.includes("e") ? 1 : -1;
    const signY = corner.includes("s") ? 1 : -1;
    const startScale = view.s;
    const startWidth = geometry.drawnWidth;
    const startHeight = geometry.drawnHeight;
    // The anchored corner, in frame-local pixels.
    const anchorX = geometry.centreX - (signX * startWidth) / 2;
    const anchorY = geometry.centreY - (signY * startHeight) / 2;
    const diagonal = Math.hypot(startWidth, startHeight);
    const unitX = (signX * startWidth) / diagonal;
    const unitY = (signY * startHeight) / diagonal;

    dragRef.current = (move) => {
      const projection =
        (move.clientX - frameRect.left - anchorX) * unitX + (move.clientY - frameRect.top - anchorY) * unitY;
      const scale = clampScale((startScale * projection) / diagonal);
      const reach = (diagonal * scale) / startScale;
      setView(() =>
        clampView({
          s: scale,
          x: ((anchorX + (unitX * reach) / 2) / frame.width) * 100 - 50,
          y: ((anchorY + (unitY * reach) / 2) / frame.height) * 100 - 50,
        })
      );
    };
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current?.({ clientX: event.clientX, clientY: event.clientY });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const element = event.currentTarget as Element;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsPanning(false);
  }

  // Frame-relative percentages, so the crop is unchanged by a resize.
  const imageStyle = geometry
    ? {
        position: "absolute" as const,
        width: `${(geometry.drawnWidth / frame.width) * 100}%`,
        height: `${(geometry.drawnHeight / frame.height) * 100}%`,
        left: `${50 + view.x}%`,
        top: `${50 + view.y}%`,
        transform: "translate(-50%,-50%)",
        maxWidth: "none",
      }
    : { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const };

  return (
    <div data-crop-surface className="mt-[10px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) loadFile(selected);
        }}
      />

      <div
        ref={frameRef}
        style={{ aspectRatio }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files[0];
          if (dropped) loadFile(dropped);
        }}
        // The frame is the control: empty it browses, filled it opens the
        // reframe. The design's dblclick still works, and is what closes it
        // again from inside.
        onClick={() => {
          if (!previewUrl) inputRef.current?.click();
          else if (!isReframing) setIsReframing(true);
        }}
        onDoubleClick={() => {
          if (previewUrl && isReframing) exitReframe();
        }}
        className={`group relative cursor-pointer overflow-hidden border border-dashed border-borderDashed bg-tile ${className} ${
          isReframing ? "shadow-[0_0_0_2px_var(--color-ink)]" : ""
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
              setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
            style={imageStyle}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-[12px] text-center text-[13px] text-muted">
            {placeholder}
          </div>
        )}

        {/* The film card's hover scrim, reused: same colour, same 190ms fade.
            Suppressed during a reframe, where the spill owns the pointer. */}
        {previewUrl && !isReframing ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/[0.76] opacity-0 transition-opacity duration-[190ms] ease-out group-hover:opacity-100">
            <button
              type="button"
              // Deleting is not "open the reframe", so the click stops here.
              onClick={(event) => {
                event.stopPropagation();
                removeFrame();
              }}
              title="Remove this frame"
              aria-label="Remove this frame"
              // Ink on glass, not paper: the glass reads as a light disc against the
              // scrim, so a paper-coloured icon would vanish until hovered.
              className="pointer-events-auto flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-full border border-glassBorder bg-glass text-ink backdrop-blur-[16px] backdrop-saturate-[1.7] transition-colors duration-[160ms] hover:bg-glassHover"
            >
              <Trash2 size={19} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {/* The spill: the whole image, unclipped, over everything. Portalled to
          the body because the dialog that hosts this field both scrolls and
          carries a transform, either of which would clip or reposition a
          nested fixed layer. */}
      {isReframing && geometry && frameRect
        ? createPortal(
            <div
              data-crop-surface
              data-crop-spill
              onPointerDown={startPan}
              onPointerMove={continueDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "fixed",
                left: frameRect.left + (frameRect.width * (50 + view.x)) / 100,
                top: frameRect.top + (frameRect.height * (50 + view.y)) / 100,
                width: geometry.drawnWidth,
                height: geometry.drawnHeight,
                transform: "translate(-50%,-50%)",
                zIndex: 90,
                touchAction: "none",
                cursor: isPanning ? "grabbing" : "grab",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not an R2 asset */}
              <img
                src={previewUrl ?? ""}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none opacity-35 shadow-[0_0_0_1px_rgba(17,17,16,0.2),0_12px_32px_rgba(17,17,16,0.2)]"
              />
              {(["nw", "ne", "sw", "se"] as Corner[]).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(event) => startResize(event, corner)}
                  onPointerMove={continueDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: corner.includes("w") ? 0 : "100%",
                    top: corner.includes("n") ? 0 : "100%",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--color-paper)",
                    boxShadow: "0 0 0 1.5px var(--color-ink), 0 1px 3px rgba(17,17,16,0.3)",
                    transform: "translate(-50%,-50%)",
                    touchAction: "none",
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  }}
                />
              ))}
            </div>,
            document.body
          )
        : null}

      <div className="mt-[10px] flex flex-wrap items-center justify-between gap-[10px]">
        <span className="text-[12.5px] text-muted">
          {isReframing
            ? "Drag to reposition, scroll or pull a corner to resize."
            : previewUrl
              ? "Click the frame to reposition or resize it."
              : "Drop a still here, or click to browse."}
        </span>

        {isReframing ? (
          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              type="button"
              onClick={() => setView({ s: 1, x: 0, y: 0 })}
              className="cursor-pointer border border-borderStrong bg-transparent px-[14px] py-[8px] font-sans text-[13px] text-ink hover:border-ink"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={exitReframe}
              className="cursor-pointer rounded-full bg-ink px-[18px] py-[8px] font-sans text-[13px] text-paper"
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
