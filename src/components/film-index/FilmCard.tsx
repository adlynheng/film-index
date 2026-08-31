"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDirectors } from "@/lib/films/directors";
import type { FilmImage } from "@/lib/images/r2";
import type { FilmSummary } from "@/lib/types";

interface FilmCardProps {
  film: FilmSummary;
  image: FilmImage | null;
}

export function FilmCard({ film, image }: FilmCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex flex-col gap-[18px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-video w-full bg-tile">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized/pre-cached R2 asset, see spec §6
          <img
            src={image.src}
            srcSet={image.srcSet}
            // Deliberately wider than the tile's own box: object-cover scales a
            // 2.40:1 frame by height, so it renders ~1.35x wider than the box,
            // and srcset selection has no way to know that. Measured tiles are
            // ~430px at 1920, ~427px at 1440, ~452px at 1024, ~310px on a phone.
            sizes="(min-width: 1400px) 40vw, (min-width: 700px) 60vw, 100vw"
            alt={film.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <Link
          href={`/films/${film.slug}`}
          className="absolute inset-0 flex items-center justify-center bg-ink/[0.76] text-paper transition-opacity duration-[190ms] ease-out"
          style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }}
          tabIndex={-1}
          aria-hidden="true"
        >
          <div className="px-[26px] text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-overlayLabel">Directed by</div>
            <div className="mt-[10px] text-balance text-[clamp(20px,1.7vw,27px)] font-medium leading-[1.14] tracking-[-0.02em]">
              {formatDirectors(film.director) || "Director not logged"}
            </div>
          </div>
        </Link>
      </div>
      <Link href={`/films/${film.slug}`} className="flex flex-col text-left">
        <h3 className="text-balance text-[clamp(24px,2vw,32px)] font-medium leading-[1.06] tracking-[-0.028em]">
          {film.title}
        </h3>
        <span className="mt-[12px] text-[13px] text-ink">{film.year ?? ""}</span>
      </Link>
    </div>
  );
}
