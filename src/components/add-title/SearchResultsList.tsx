import type { Ref } from "react";
import { formatDirectors } from "@/lib/films/directors";
import type { TmdbSearchResult } from "@/lib/tmdb/client";

interface SearchResultsListProps {
  results: TmdbSearchResult[];
  onPick: (result: TmdbSearchResult) => void;
  // Keyboard highlight, driven from the search input above.
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  listRef?: Ref<HTMLUListElement>;
  listId?: string;
}

// TMDB's director is "" for anything with no credited director and no
// creator, so the parts are joined rather than templated — otherwise the row
// reads "2010 · " with a dangling separator.
function buildMetaLabel(result: TmdbSearchResult): string {
  return [result.year, formatDirectors(result.director)].filter(Boolean).join("  ·  ");
}

export function SearchResultsList({
  results,
  onPick,
  activeIndex = -1,
  onActiveIndexChange,
  listRef,
  listId,
}: SearchResultsListProps) {
  if (results.length === 0) return null;

  return (
    // One of the Global Constraints' floating-UI exceptions: a dropdown must
    // overlay its siblings without displacing them, like the modal backdrop.
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label="Search results"
      className="absolute left-0 right-0 top-full z-[5] max-h-[250px] overflow-y-auto border border-t-0 border-border bg-paper"
    >
      {results.map((result, index) => (
        <li
          key={`${result.title}-${result.year}-${index}`}
          id={listId ? `${listId}-${index}` : undefined}
          role="option"
          aria-selected={index === activeIndex}
          className="border-b border-borderFaint"
        >
          <button
            type="button"
            onClick={() => onPick(result)}
            onMouseEnter={() => onActiveIndexChange?.(index)}
            className={`flex w-full cursor-pointer items-baseline justify-between gap-[16px] px-[15px] py-[13px] text-left transition-colors duration-[140ms] hover:bg-rowHover ${
              index === activeIndex ? "bg-rowHover" : ""
            }`}
          >
            <span className="text-[15px]">{result.title}</span>
            <span className="whitespace-nowrap text-[12px] text-muted">{buildMetaLabel(result)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
