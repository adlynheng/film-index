interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ROUND_BUTTON =
  "flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border border-borderStrong bg-transparent text-[18px] leading-none transition-colors duration-[140ms] hover:bg-tile";

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-[34px] right-[40px] z-10 flex items-center gap-[10px]">
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={ROUND_BUTTON}>
        –
      </button>
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={ROUND_BUTTON}>
        +
      </button>
      <button
        type="button"
        onClick={onReset}
        className="h-[38px] cursor-pointer rounded-full border border-borderStrong bg-transparent px-[18px] text-[13px] transition-colors duration-[140ms] hover:bg-tile"
      >
        Reset view
      </button>
    </div>
  );
}
