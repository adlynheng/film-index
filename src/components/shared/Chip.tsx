interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-[17px] pb-[10px] pt-[9px] text-sm tracking-[0.01em] transition-colors duration-[140ms] ${
        active ? "border border-ink bg-ink text-paper" : "border border-borderStrong bg-transparent text-body"
      }`}
    >
      {label}
    </button>
  );
}
