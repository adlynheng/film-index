import { Chip } from "@/components/shared/Chip";
import type { FilmCategory } from "@/lib/types";

const ALL_CATEGORIES: (FilmCategory | "Franchises")[] = ["Movies", "TV shows", "Animation", "Documentaries", "Franchises"];

interface CategoryChipsProps {
  selected: (FilmCategory | "Franchises")[];
  onToggle: (category: FilmCategory | "Franchises") => void;
  onClearAll: () => void;
}

export function CategoryChips({ selected, onToggle, onClearAll }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      <Chip label="All" active={selected.length === 0} onClick={onClearAll} />
      {ALL_CATEGORIES.map((category) => (
        <Chip key={category} label={category} active={selected.includes(category)} onClick={() => onToggle(category)} />
      ))}
    </div>
  );
}
