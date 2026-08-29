import { FilmGrid } from "@/components/film-index/FilmGrid";
import type { FilmImage } from "@/lib/images/r2";
import type { Franchise } from "@/lib/types";

interface FranchiseSectionProps {
  franchise: Franchise;
  imageByFilmId: Map<string, FilmImage | null>;
}

export function FranchiseSection({ franchise, imageByFilmId }: FranchiseSectionProps) {
  const years = franchise.films.map((film) => film.year).filter((year): year is number => year !== null);
  const yearSpan = years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "";

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-[24px] gap-y-[8px] border-t border-border px-[4px] pt-[26px]">
        <span className="min-w-[52px] text-[13px] text-muted">
          {String(franchise.films.length).padStart(2, "0")} films
        </span>
        <h2 className="min-w-[180px] flex-1 text-[clamp(26px,3vw,44px)] font-medium leading-none tracking-[-0.025em]">
          {franchise.name}
        </h2>
        <span className="text-[13px] text-muted">{yearSpan}</span>
      </div>
      <div className="mt-[56px]">
        <FilmGrid films={franchise.films} imageByFilmId={imageByFilmId} />
      </div>
    </section>
  );
}
