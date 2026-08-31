interface ActorSearchFieldProps {
  query: string;
  onQueryChange: (query: string) => void;
  statLabel: string;
}

export function ActorSearchField({ query, onQueryChange, statLabel }: ActorSearchFieldProps) {
  return (
    <div className="pointer-events-auto flex flex-col gap-[24px]">
      <div className="flex max-w-[300px] -mt-[8px] -mx-[18px] pt-[12px] px-[18px] items-center gap-[12px] rounded-[4px] border-b border-borderStrong backdrop-blur-[16px] backdrop-saturate-[1.7] pb-[9px]">
        <span className="text-[13px] text-muted">Search</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Actor name"
          aria-label="Search for an actor"
          className="min-w-0 flex-1 border-none bg-transparent text-[16px] outline-none"
        />
      </div>
      <div className="text-[13px] -mt-[12px] -mx-[18px] px-[18px] text-muted rounded-[4px] max-w-fit backdrop-blur-[16px] backdrop-saturate-[1.7]">{statLabel}</div >
    </div>
  );
}
