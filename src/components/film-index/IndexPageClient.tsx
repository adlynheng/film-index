"use client";

import { useMemo, useState } from "react";
import { AddTitleButton } from "@/components/film-index/AddTitleButton";
import { CategoryChips } from "@/components/film-index/CategoryChips";
import { FilmGrid } from "@/components/film-index/FilmGrid";
import { FranchiseSection } from "@/components/film-index/FranchiseSection";
import { IndexHeader } from "@/components/film-index/IndexHeader";
import { SiteFooter } from "@/components/film-index/SiteFooter";
import { SortControls } from "@/components/film-index/SortControls";
import { buildFilmImage, type FilmImage } from "@/lib/images/r2";
import type { FilmCategory, FilmSummary, Franchise } from "@/lib/types";

interface IndexPageClientProps {
  films: FilmSummary[];
  franchises: Franchise[];
  isOwner: boolean;
}

export function IndexPageClient({ films, franchises, isOwner }: IndexPageClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<(FilmCategory | "Franchises")[]>([]);
  const [sortBy, setSortBy] = useState<"year" | "title">("year");

  const imageByFilmId = useMemo(() => {
    const map = new Map<string, FilmImage | null>();
    for (const film of films) {
      map.set(film.id, buildFilmImage(film.posterKey));
    }
    return map;
  }, [films]);

  const showingFranchises = selectedCategories.includes("Franchises");
  const activeCategoryFilters = useMemo(
    () => selectedCategories.filter((category): category is FilmCategory => category !== "Franchises"),
    [selectedCategories]
  );

  // The flat grid and the grouped franchise view are independent, as in the
  // source design: picking "Franchises" alongside "Movies" shows both. The grid
  // hides only when "Franchises" is the sole selection.
  const gridActive = selectedCategories.length === 0 || activeCategoryFilters.length > 0;

  const visibleFilms = useMemo(() => {
    const filtered =
      activeCategoryFilters.length === 0
        ? films
        : films.filter((film) => film.categories.some((category) => activeCategoryFilters.includes(category)));
    return [...filtered].sort((a, b) =>
      sortBy === "title" ? a.title.localeCompare(b.title) : (b.year ?? 0) - (a.year ?? 0)
    );
  }, [films, activeCategoryFilters, sortBy]);

  function toggleCategory(category: FilmCategory | "Franchises") {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((selected) => selected !== category) : [...current, category]
    );
  }

  return (
    <div className="overflow-x-hidden px-[40px]">
      <IndexHeader countLabel={`${films.length} titles logged`} />

      <main>
        <h1 className="mt-[26px] text-balance text-center text-[clamp(64px,13.2vw,220px)] font-medium leading-[0.86] tracking-[-0.045em]">
          My Film Index
        </h1>

        <p className="mx-auto mt-[34px] max-w-[760px] text-pretty text-center text-[17px] leading-[1.45] text-body">
          Everything I&rsquo;ve watched, kept in one place. Films, series, animation and documentaries — logged as I go,
          with the people who made them.
        </p>

        <div className="mt-[96px] flex flex-wrap items-center justify-between gap-[24px] pb-[18px]">
          <CategoryChips
            selected={selectedCategories}
            onToggle={toggleCategory}
            onClearAll={() => setSelectedCategories([])}
          />
          <SortControls sortBy={sortBy} onChange={setSortBy} />
        </div>

        {gridActive &&
          (visibleFilms.length > 0 ? (
            <div className="mt-[56px]">
              <FilmGrid films={visibleFilms} imageByFilmId={imageByFilmId} />
            </div>
          ) : (
            <p className="my-[80px] text-[17px] text-muted">Nothing logged in these categories yet.</p>
          ))}

        {showingFranchises && (
          <div className="mt-[64px] flex flex-col gap-[96px]">
            {franchises.map((franchise) => (
              <FranchiseSection key={franchise.id} franchise={franchise} imageByFilmId={imageByFilmId} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

      {isOwner && <AddTitleButton onClick={() => {/* Task 18 wires this to open AddTitleModal */}} />}
    </div>
  );
}
