import { FilmGrid } from "@/components/film-index/FilmGrid";
import type { FilmImage } from "@/lib/images/r2";
import type { FilmGroup } from "@/lib/types";

interface FilmGroupSectionProps {
  group: FilmGroup;
  imageByFilmId: Map<string, FilmImage | null>;
}

/** One heading and grid, for a franchise or a studio — the two views are identical by design. */
export function FilmGroupSection({ group, imageByFilmId }: FilmGroupSectionProps) {
  const years = group.films.map((film) => film.year).filter((year): year is number => year !== null);
  const yearSpan = years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "";

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-[24px] gap-y-[8px] border-t border-border px-[4px] pt-[26px]">
        <span className="min-w-[52px] text-[13px] text-muted">
          {String(group.films.length).padStart(2, "0")} {group.films.length === 1 ? "film" : "films"}
        </span>
        <h2 className="min-w-[180px] flex-1 text-[clamp(26px,3vw,44px)] font-medium leading-none tracking-[-0.025em]">
          {group.name}
        </h2>
        <span className="text-[13px] text-muted">{yearSpan}</span>
      </div>
      <div className="mt-[56px]">
        <FilmGrid films={group.films} imageByFilmId={imageByFilmId} />
      </div>
    </section>
  );
}
