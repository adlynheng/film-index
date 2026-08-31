import { Chip } from "@/components/shared/Chip";
import type { ChipFilter } from "@/lib/types";

// The two grouped views sit at the end, after the categories proper.
const ALL_FILTERS: ChipFilter[] = ["Movies", "TV shows", "Animation", "Documentaries", "Franchises", "Studios"];

interface CategoryChipsProps {
  selected: ChipFilter[];
  onToggle: (filter: ChipFilter) => void;
  onClearAll: () => void;
}

export function CategoryChips({ selected, onToggle, onClearAll }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      <Chip label="All" active={selected.length === 0} onClick={onClearAll} />
      {ALL_FILTERS.map((filter) => (
        <Chip key={filter} label={filter} active={selected.includes(filter)} onClick={() => onToggle(filter)} />
      ))}
    </div>
  );
}
