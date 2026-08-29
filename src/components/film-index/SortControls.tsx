type SortOption = "year" | "title";

interface SortControlsProps {
  sortBy: SortOption;
  onChange: (sortBy: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "title", label: "Title" },
];

export function SortControls({ sortBy, onChange }: SortControlsProps) {
  return (
    <div className="flex items-center gap-[18px] text-sm">
      <span className="text-muted">Sort by:</span>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`cursor-pointer border-b bg-transparent p-0 text-sm ${
            option.value === sortBy ? "border-ink text-ink" : "border-transparent text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
