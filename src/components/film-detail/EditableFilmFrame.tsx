"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { updateFilmFrame } from "@/actions/updateFilmFrame";
import { ImageCropField, type ImageCropFieldHandle } from "@/components/shared/ImageCropField";

interface EditableFilmFrameProps {
  filmId: string;
  /** Whether a still is stored: it decides between "edit this frame" and "add one". */
  hasFrame: boolean;
  /** The read-only frame, rendered underneath the overlay so both views show the same image. */
  children: ReactNode;
}

/**
 * The owner's controls over a film's still, laid over the frame on the detail
 * page — the same pair of gestures the add-title dialog's field has: hover for
 * the scrim and its delete button, click to edit.
 *
 * Editing hands the frame to `ImageCropField`, seeded with the stored still
 * fetched back through `/api/frames/source`; Save renders the crop and writes
 * it. Only the owner ever renders this, and `updateFilmFrame` checks the
 * cookie again on the way in.
 */
export function EditableFilmFrame({ filmId, hasFrame, children }: EditableFilmFrameProps) {
  const router = useRouter();
  const cropRef = useRef<ImageCropFieldHandle>(null);

  const [mode, setMode] = useState<"view" | "opening" | "editing">("view");
  const [seedFile, setSeedFile] = useState<File | null>(null);
  // Save stays out of reach until something has actually changed, so it can
  // never re-encode and re-upload a still that nobody touched.
  const [isChanged, setIsChanged] = useState(false);
  // Whether the crop field is holding an image, which the hint below reads —
  // an empty field says its own piece in the middle of the frame.
  const [hasFieldImage, setHasFieldImage] = useState(hasFrame);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leaveEditing = useCallback(() => {
    setMode("view");
    setSeedFile(null);
    setIsChanged(false);
  }, []);

  // Escape backs out of the whole editor. While the crop field is reframing it
  // takes Escape first (in the capture phase, and stops it) to leave the
  // reframe, so this only ever fires on the second press.
  useEffect(() => {
    if (mode !== "editing" || isSaving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") leaveEditing();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, leaveEditing, mode]);

  async function beginEditing() {
    if (mode !== "view") return;
    setError(null);

    setHasFieldImage(hasFrame);

    // Nothing stored yet: the crop field opens empty, and clicking it browses.
    if (!hasFrame) {
      setSeedFile(null);
      setMode("editing");
      return;
    }

    setMode("opening");
    try {
      const response = await fetch(`/api/frames/source?film=${filmId}`);
      if (!response.ok) throw new Error(`Frame source responded ${response.status}`);
      const blob = await response.blob();
      setSeedFile(new File([blob], "frame.webp", { type: blob.type || "image/webp" }));
      setMode("editing");
    } catch (cause) {
      console.error("Could not open the stored frame for editing:", cause);
      setError("Could not open this frame for editing.");
      setMode("view");
    }
  }

  async function write(frameImageBytes: ArrayBuffer | null) {
    setIsSaving(true);
    setError(null);
    try {
      await updateFilmFrame({ filmId, frameImageBytes });
      leaveEditing();
      setIsConfirmingRemove(false);
      // The frame lives in a Server Component, so the new still only appears
      // once this route is rendered again.
      router.refresh();
    } catch (cause) {
      console.error("Saving the frame failed:", cause);
      setError("Saving the frame failed — nothing was changed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditing() {
    const cropped = await cropRef.current?.exportFrame();
    await write(cropped ? await cropped.arrayBuffer() : null);
  }

  if (mode === "editing") {
    return (
      <>
        <ImageCropField
          ref={cropRef}
          initialFile={seedFile}
          startInReframe
          showChrome={false}
          // The frame takes its shape from the hero's box, which is 16:9 until
          // a short window makes it shorter — either way what is exported is
          // exactly what the editor showed.
          aspectRatio={null}
          className="absolute inset-0"
          onFrameChange={(file) => {
            setIsChanged(true);
            setHasFieldImage(file !== null);
          }}
        />

        {/* Marked as part of the crop surface so pressing these buttons is not
            read as the click-outside that ends a reframe — which would settle
            the crop asynchronously, after Save had already read it. */}
        <div
          data-crop-surface
          className="absolute bottom-[14px] left-1/2 z-[95] flex -translate-x-1/2 items-center gap-[10px] rounded-full border border-glassBorder bg-glass py-[7px] pl-[16px] pr-[7px] shadow-[0_8px_30px_rgba(17,17,16,0.16),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-[16px] backdrop-saturate-[1.7]"
        >
          <button
            type="button"
            onClick={leaveEditing}
            disabled={isSaving}
            className="cursor-pointer rounded-full bg-transparent px-[12px] py-[7px] font-sans text-[13px] text-ink hover:text-mutedStrong disabled:cursor-default"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEditing}
            disabled={!isChanged || isSaving}
            className="cursor-pointer rounded-full bg-ink px-[16px] py-[7px] font-sans text-[13px] text-paper transition-opacity duration-[160ms] disabled:cursor-default disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save frame"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {children}

      <div className="group absolute inset-0" onMouseLeave={() => setIsConfirmingRemove(false)}>
        <button
          type="button"
          onClick={beginEditing}
          disabled={mode === "opening"}
          title={hasFrame ? "Edit this frame" : "Add a frame"}
          aria-label={hasFrame ? "Edit this frame" : "Add a frame"}
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
        />

        {/* The film card's scrim, to the letter: same colour, same 190ms fade. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[12px] bg-ink/[0.76] px-[20px] text-center opacity-0 transition-opacity duration-[190ms] ease-out group-hover:opacity-100">
          {hasFrame ? (
            isConfirmingRemove ? (
              <button
                type="button"
                onClick={() => write(null)}
                disabled={isSaving}
                className="pointer-events-auto cursor-pointer rounded-full border border-glassBorder bg-glass px-[18px] py-[12px] font-sans text-[13px] text-ink backdrop-blur-[16px] backdrop-saturate-[1.7] transition-colors duration-[160ms] hover:bg-glassHover disabled:cursor-default"
              >
                {isSaving ? "Removing…" : "Remove this frame?"}
              </button>
            ) : (
              <button
                type="button"
                // Removing a stored still deletes it from the bucket, so it
                // asks first — in place, rather than through a browser dialog.
                onClick={() => setIsConfirmingRemove(true)}
                title="Remove this frame"
                aria-label="Remove this frame"
                // Ink on glass, not paper: the glass reads as a light disc
                // against the scrim, so a paper-coloured icon would vanish.
                className="pointer-events-auto flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-full border border-glassBorder bg-glass text-ink backdrop-blur-[16px] backdrop-saturate-[1.7] transition-colors duration-[160ms] hover:bg-glassHover"
              >
                <Trash2 size={19} strokeWidth={1.6} aria-hidden="true" />
              </button>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
