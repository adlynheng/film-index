"use client";

import { useEffect, useState } from "react";

interface FrameUploadFieldProps {
  onFileSelected: (file: File) => void;
}

export function FrameUploadField({ onFileSelected }: FrameUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // An object URL pins its blob in memory until it is revoked, and picking a
  // second frame replaces the first — so each URL is released when it stops
  // being the current one, and on unmount.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFileChange(file: File) {
    onFileSelected(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    // A <label> rather than a div with an onClick: its implicit association
    // with the nested input already opens the file picker, so only the
    // drag-and-drop path needs handlers of its own.
    <label
      className="relative mt-[10px] block aspect-video w-full cursor-pointer border border-dashed border-borderDashed bg-tile"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) handleFileChange(droppedFile);
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          if (selectedFile) handleFileChange(selectedFile);
        }}
      />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL, not an R2 asset
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[13px] text-muted">
          Drop a frame, or click to browse
        </div>
      )}
    </label>
  );
}
