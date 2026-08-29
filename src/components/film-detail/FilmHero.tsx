import type { FilmImage } from "@/lib/images/r2";

// Returns two grid children rather than one wrapper: the design places the
// title in row 1 and the still in row 2 of the detail grid, so that the cast
// panel in column 2 can centre itself against the still alone.
interface FilmHeroProps {
  title: string;
  yearLabel: string;
  image: FilmImage | null;
}

export function FilmHero({ title, yearLabel, image }: FilmHeroProps) {
  return (
    <>
      <div className="col-start-1 row-start-1 mt-[26px] min-[700px]:mt-[72px]">
        <div className="flex flex-wrap items-baseline gap-x-[16px] gap-y-[6px]">
          <h1 className="text-balance text-[clamp(24px,2.5vw,38px)] font-medium leading-[1.02] tracking-[-0.03em]">
            {title}
          </h1>
          <span className="text-[clamp(16px,1.4vw,21px)] font-medium leading-none tracking-[-0.02em] text-mutedStrong">
            {yearLabel}
          </span>
        </div>
      </div>
      <div className="col-start-1 row-start-2 mt-[clamp(14px,2.2vh,26px)]">
        {/* Sized so the still fits the viewport height rather than overflowing it. */}
        <div className="relative aspect-video w-full bg-tile min-[700px]:w-[min(100%,calc((100vh-340px)*16/9))]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-sized/pre-cached R2 asset, see spec §6
            <img
              src={image.src}
              srcSet={image.srcSet}
              // Cover-adjusted, as in FilmCard: the still's box is ~968px at a
              // 1440 viewport (67vw), and a 2.40:1 frame renders ~1.35x wider.
              sizes="(min-width: 700px) 90vw, 100vw"
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
