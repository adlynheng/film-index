import { EditableFilmFrame } from "@/components/film-detail/EditableFilmFrame";
import type { FilmImage } from "@/lib/images/r2";

// Returns two grid children rather than one wrapper: the design places the
// title in row 1 and the still in row 2 of the detail grid, so that the cast
// panel in column 2 can centre itself against the still alone.
interface FilmHeroProps {
  filmId: string;
  title: string;
  yearLabel: string;
  image: FilmImage | null;
  /** The owner gets the frame's editing controls laid over it; everyone else gets the still alone. */
  isOwner: boolean;
}

export function FilmHero({ filmId, title, yearLabel, image, isOwner }: FilmHeroProps) {
  const still = image ? (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized/pre-cached R2 asset, see spec §6
    <img
      src={image.src}
      srcSet={image.srcSet}
      // Cover-adjusted, as in FilmCard: the still's box is ~968px at a
      // 1440 viewport (67vw), and a 2.40:1 frame renders ~1.35x wider.
      sizes="(min-width: 768px) 90vw, 100vw"
      alt={title}
      className="h-full w-full object-cover"
    />
  ) : null;


  return (
    <>
      <div className="col-start-1 row-start-1 mt-[26px] md:mt-[clamp(14px,3.4vh,52px)]">
        <div className="flex flex-wrap items-baseline gap-x-[16px] gap-y-[6px]">
          <h1 className="text-balance text-[clamp(24px,2.5vw,38px)] font-medium leading-[1.02] tracking-[-0.03em]">
            {title}
          </h1>
          <span className="text-[clamp(16px,1.4vw,21px)] font-medium leading-none tracking-[-0.02em] text-mutedStrong">
            {yearLabel}
          </span>
        </div>
      </div>
      <div className="col-start-1 row-start-2 mt-[clamp(12px,2vh,26px)] md:min-h-0">
        {/* Full column width, so the frame's edges meet the rule above the
            details exactly. Height is the elastic dimension instead: max-h-full
            clamps the frame to the space its grid row was given, and since the
            source is a 2.40:1 scope still, a box shorter than 16:9 simply crops
            less of its width. */}
        <div className="relative aspect-video max-h-full w-full bg-tile">
          {isOwner ? (
            <EditableFilmFrame filmId={filmId} hasFrame={image !== null}>
              {still}
            </EditableFilmFrame>
          ) : (
            still
          )}
        </div>
      </div>
    </>
  );
}
