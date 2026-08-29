import Link from "next/link";
import { notFound } from "next/navigation";
import { CastList } from "@/components/film-detail/CastList";
import { FilmHero } from "@/components/film-detail/FilmHero";
import { getFilmBySlug } from "@/lib/db/films";
import { buildImageUrl } from "@/lib/images/r2";

interface FilmDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FilmDetailPage({ params }: FilmDetailPageProps) {
  const { slug } = await params;
  const film = await getFilmBySlug(slug);
  if (!film) notFound();

  // "Filed under" carries the franchise alongside the categories, as in the design.
  const filedUnder = [...film.categories, ...(film.franchiseName ? [film.franchiseName] : [])].join(", ");

  return (
    <div className="overflow-x-hidden px-[40px] pt-[28px]">
      {/* The design's "Back" is an in-page state toggle; here the detail view is
          its own route, so it is a real link to the index. */}
      <Link href="/" className="inline-flex items-center gap-[12px] text-[16px] hover:text-mutedStrong">
        <span className="-translate-y-px text-[22px] leading-none">←</span>
        Back
      </Link>

      <main className="mt-[clamp(16px,2.6vh,30px)] grid grid-cols-[minmax(0,1fr)] gap-x-[52px] pb-[36px] min-[700px]:grid-cols-[minmax(0,1fr)_minmax(260px,25%)]">
        <FilmHero
          title={film.title}
          yearLabel={film.year ? `(${film.year})` : ""}
          imageUrl={buildImageUrl(film.posterKey, "full")}
        />

        <dl className="col-start-1 row-start-3 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-[52px] gap-y-[20px] border-t border-border pt-[20px]">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-muted">Directed by</dt>
            <dd className="mt-[8px] text-[clamp(17px,1.4vw,21px)] font-medium tracking-[-0.02em]">
              {film.director ?? "Director not logged"}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-muted">Year</dt>
            <dd className="mt-[8px] text-[clamp(17px,1.4vw,21px)] font-medium tracking-[-0.02em]">{film.year ?? ""}</dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-muted">Filed under</dt>
            <dd className="mt-[8px] text-[clamp(17px,1.4vw,21px)] font-medium tracking-[-0.02em]">{filedUnder}</dd>
          </div>
        </dl>

        {/* Column 2 beside the still on desktop, stacked last on narrow screens. */}
        <div className="col-start-1 row-start-4 mt-[36px] self-start min-[700px]:col-start-2 min-[700px]:row-start-2 min-[700px]:mt-[clamp(14px,2.2vh,26px)] min-[700px]:max-h-[calc(100vh-310px)] min-[700px]:self-center min-[700px]:overflow-y-auto">
          <CastList cast={film.cast} />
        </div>
      </main>
    </div>
  );
}
