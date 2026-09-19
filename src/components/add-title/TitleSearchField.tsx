import type { KeyboardEvent } from "react";

interface TitleSearchFieldProps {
  query: string;
  onQueryChange: (query: string) => void;
  isSearching: boolean;
  // Arrow-key navigation of the results list below, which the dialog owns
  // because the input and the list are separate components.
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  isListOpen?: boolean;
  listId?: string;
  activeOptionId?: string;
}

export function TitleSearchField({
  query,
  onQueryChange,
  isSearching,
  onKeyDown,
  isListOpen = false,
  listId,
  activeOptionId,
}: TitleSearchFieldProps) {
  return (
    <div className="flex items-center gap-[12px] border-b border-borderStrong pb-[8px]">
      <span className="text-[13px] text-muted">Search</span>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Start typing a film or series…"
        aria-label="Search for a film or series"
        role="combobox"
        aria-expanded={isListOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        className="min-w-0 flex-1 border-none bg-transparent text-[22px] font-medium tracking-[-0.02em] outline-none"
      />
      {isSearching ? (
        <span className="text-[12px] text-muted" role="status" aria-label="Searching">
          …
        </span>
      ) : null}
    </div>
  );
}
