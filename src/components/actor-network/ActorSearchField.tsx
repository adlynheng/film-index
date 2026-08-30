interface ActorSearchFieldProps {
  query: string;
  onQueryChange: (query: string) => void;
  statLabel: string;
}

export function ActorSearchField({ query, onQueryChange, statLabel }: ActorSearchFieldProps) {
  return (
    <div className="pointer-events-auto flex flex-col gap-[26px]">
      <div className="flex max-w-[300px] items-center gap-[12px] border-b border-borderStrong bg-network pb-[9px]">
        <span className="text-[13px] text-muted">Search</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Actor name"
          aria-label="Search for an actor"
          className="min-w-0 flex-1 border-none bg-transparent text-[16px] outline-none"
        />
      </div>
      <div className="text-[13px] text-muted">{statLabel}</div>
    </div>
  );
}
