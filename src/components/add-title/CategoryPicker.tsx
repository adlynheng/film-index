import { Chip } from "@/components/shared/Chip";
import type { FilmCategory } from "@/lib/types";

// "Franchises" is deliberately absent: it is an index filter, not a category a
// film can be filed under. The franchise itself is chosen by FranchisePicker.
const PICKABLE_CATEGORIES: FilmCategory[] = ["Movies", "TV shows", "Animation", "Documentaries"];

interface CategoryPickerProps {
  selected: FilmCategory[];
  onToggle: (category: FilmCategory) => void;
}

export function CategoryPicker({ selected, onToggle }: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      {PICKABLE_CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={category}
          active={selected.includes(category)}
          onClick={() => onToggle(category)}
          size="compact"
        />
      ))}
    </div>
  );
}
