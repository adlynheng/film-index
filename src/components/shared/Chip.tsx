interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  // The add-title modal's category chips are a size down from the index's
  // filter chips in the design (13px/8-15-9 against 14px/9-17-10), so the
  // one component carries both rather than being forked.
  size?: "default" | "compact";
}

export function Chip({ label, active, onClick, size = "default" }: ChipProps) {
  const sizeClasses =
    size === "compact"
      ? "px-[15px] pb-[9px] pt-[8px] text-[13px]"
      : "px-[17px] pb-[10px] pt-[9px] text-sm tracking-[0.01em]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full transition-colors duration-[140ms] ${sizeClasses} ${
        active ? "border border-ink bg-ink text-paper" : "border border-borderStrong bg-transparent text-body"
      }`}
    >
      {label}
    </button>
  );
}
