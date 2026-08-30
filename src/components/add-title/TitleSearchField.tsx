interface TitleSearchFieldProps {
  query: string;
  onQueryChange: (query: string) => void;
  isSearching: boolean;
}

export function TitleSearchField({ query, onQueryChange, isSearching }: TitleSearchFieldProps) {
  return (
    <div className="flex items-center gap-[12px] border-b border-borderStrong pb-[8px]">
      <span className="text-[13px] text-muted">Search</span>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Start typing a film or series…"
        aria-label="Search for a film or series"
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
