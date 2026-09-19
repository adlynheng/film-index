import type { CastCredit } from "@/lib/types";

interface CastListProps {
  cast: CastCredit[];
}

export function CastList({ cast }: CastListProps) {
  const credits = cast.length > 0 ? cast : [{ personId: "unlisted", name: "Cast not logged yet", role: "" }];

  return (
    <div className="flex flex-col">
      <h2 className="pb-[6px] text-[11px] uppercase tracking-[0.14em] text-muted">Cast</h2>
      <ul className="flex flex-col">
        {credits.map((credit) => (
          <li
            key={credit.personId}
            className="flex items-baseline justify-between gap-[16px] border-t border-border py-[11px] leading-[1.35]"
          >
            <span className="text-sm font-medium tracking-[-0.012em]">{credit.name}</span>
            <span className="text-[12.5px] text-muted">{credit.role ? `as ${credit.role}` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
