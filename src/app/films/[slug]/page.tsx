import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CastList } from "@/components/film-detail/CastList";
import { FilmHero } from "@/components/film-detail/FilmHero";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { getFilmBySlug } from "@/lib/db/films";
import { formatDirectors } from "@/lib/films/directors";
import { buildFilmImage } from "@/lib/images/r2";

interface FilmDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function FilmDetailPage({ params }: FilmDetailPageProps) {
  const { slug } = await params;
  // Reading the cookie opts this route into dynamic rendering, as on the index:
  // the frame's editing controls are the owner's alone.
  const [cookieStore, film] = await Promise.all([cookies(), getFilmBySlug(slug)]);
  if (!film) notFound();
  const isOwner = isOwnerRequest(cookieStore.get(OWNER_COOKIE_NAME)?.value);

  // "Filed under" carries the groupings alongside the categories, as in the
  // design — the franchise first, then the studio.
  const filedUnder = [...film.categories, film.franchiseName, film.studioName].filter(Boolean).join(", ");

  return (
    // From md up the page is exactly one viewport tall and never scrolls: the
    // still is the only elastic element, so it absorbs whatever the fixed rows
    // (title, details, cast) leave over instead of pushing them off-screen.
    <div className="overflow-x-hidden px-[40px] pt-[28px] md:flex md:h-screen md:flex-col md:overflow-hidden md:pb-[28px]">
      {/* The design's "Back" is an in-page state toggle; here the detail view is
          its own route, so it is a real link to the index. */}
      <Link href="/" className="inline-flex w-fit shrink-0 items-center gap-[12px] text-[16px] hover:text-mutedStrong">
        <span className="-translate-y-px text-[22px] leading-none">←</span>
        Back
      </Link>

      <main className="mt-[clamp(12px,1.4vh,24px)] grid grid-cols-[minmax(0,1fr)] gap-x-[52px] pb-[36px] md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,1fr)_minmax(260px,25%)] md:grid-rows-[auto_minmax(0,1fr)_auto] md:pb-0">
        <FilmHero
          filmId={film.id}
          title={film.title}
          yearLabel={film.year ? `(${film.year})` : ""}
          image={buildFilmImage(film.posterKey)}
          isOwner={isOwner}
        />

        {/* Column 1's full width, which is what the still is now sized against:
            the rule above these definitions and the frame line up exactly. */}
        <dl className="col-start-1 row-start-3 mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-[52px] gap-y-[20px] border-t border-border pt-[20px] md:mt-[clamp(12px,1.8vh,22px)] md:pt-[clamp(12px,1.6vh,20px)]">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-muted">Directed by</dt>
            <dd className="mt-[8px] text-[clamp(17px,1.4vw,21px)] font-medium tracking-[-0.02em]">
              {formatDirectors(film.director) || "Director not logged"}
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

        {/* Column 2 beside the still on desktop, stacked last on narrow screens.
            Capped to its row and scrolled internally, so a long cast list can
            never be what makes the page taller than the viewport. */}
        <div className="col-start-1 row-start-4 mt-[36px] self-start md:col-start-2 md:row-start-2 md:mt-0 md:max-h-full md:min-h-0 md:self-center md:overflow-y-auto">
          <CastList cast={film.cast} />
        </div>
      </main>
    </div>
  );
}
