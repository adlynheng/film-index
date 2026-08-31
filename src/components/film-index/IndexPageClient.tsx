"use client";

import { useMemo, useState } from "react";
import { AddTitleModal } from "@/components/add-title/AddTitleModal";
import { AddTitleButton } from "@/components/film-index/AddTitleButton";
import { CategoryChips } from "@/components/film-index/CategoryChips";
import { FilmGrid } from "@/components/film-index/FilmGrid";
import { FilmGroupSection } from "@/components/film-index/FilmGroupSection";
import { IndexHeader } from "@/components/film-index/IndexHeader";
import { SiteFooter } from "@/components/film-index/SiteFooter";
import { SortControls } from "@/components/film-index/SortControls";
import { buildFilmImage, type FilmImage } from "@/lib/images/r2";
import type { ChipFilter, FilmCategory, FilmGroup, FilmSummary } from "@/lib/types";

interface IndexPageClientProps {
  films: FilmSummary[];
  franchises: FilmGroup[];
  studios: FilmGroup[];
  isOwner: boolean;
}

export function IndexPageClient({ films, franchises, studios, isOwner }: IndexPageClientProps) {
  const [selectedFilters, setSelectedFilters] = useState<ChipFilter[]>([]);
  const [sortBy, setSortBy] = useState<"year" | "title">("year");
  const [isAddingTitle, setIsAddingTitle] = useState(false);

  const imageByFilmId = useMemo(() => {
    const map = new Map<string, FilmImage | null>();
    for (const film of films) {
      map.set(film.id, buildFilmImage(film.posterKey));
    }
    return map;
  }, [films]);

  const showingFranchises = selectedFilters.includes("Franchises");
  const showingStudios = selectedFilters.includes("Studios");
  const activeCategoryFilters = useMemo(
    () =>
      selectedFilters.filter(
        (filter): filter is FilmCategory => filter !== "Franchises" && filter !== "Studios"
      ),
    [selectedFilters]
  );

  // The flat grid and the grouped views are independent, as in the source
  // design: picking "Franchises" alongside "Movies" shows both. The grid hides
  // only when the grouped views are the whole selection.
  const gridActive = selectedFilters.length === 0 || activeCategoryFilters.length > 0;

  const visibleFilms = useMemo(() => {
    const filtered =
      activeCategoryFilters.length === 0
        ? films
        : films.filter((film) => film.categories.some((category) => activeCategoryFilters.includes(category)));
    return [...filtered].sort((a, b) =>
      sortBy === "title" ? a.title.localeCompare(b.title) : (b.year ?? 0) - (a.year ?? 0)
    );
  }, [films, activeCategoryFilters, sortBy]);

  function toggleFilter(filter: ChipFilter) {
    setSelectedFilters((current) =>
      current.includes(filter) ? current.filter((selected) => selected !== filter) : [...current, filter]
    );
  }

  return (
    <div className="overflow-x-hidden px-[40px]">
      <IndexHeader countLabel={`${films.length} titles logged`} />

      <main>
        <h1 className="mt-[26px] text-balance text-center text-[clamp(64px,13.2vw,220px)] font-medium leading-[0.86] tracking-[-0.045em]">
          My Film Index
        </h1>

        <p className="mx-auto mt-[42px] max-w-[620px] text-pretty text-center text-[17px] leading-[1.45] text-body">
          Everything I&rsquo;ve watched, kept in one place. Films, series, animation and documentaries — logged as I go,
          with the people who made them.
        </p>

        <div className="mt-[96px] flex flex-wrap items-center justify-between gap-[24px] pb-[18px]">
          <CategoryChips
            selected={selectedFilters}
            onToggle={toggleFilter}
            onClearAll={() => setSelectedFilters([])}
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

        {/* Both grouped views say so when they are empty rather than leaving the
            page blank — a grouping only exists once a title has been filed
            under it, so "none yet" is the ordinary early state. */}
        {showingFranchises &&
          (franchises.length > 0 ? (
            <div className="mt-[64px] flex flex-col gap-[96px]">
              {franchises.map((franchise) => (
                <FilmGroupSection key={franchise.id} group={franchise} imageByFilmId={imageByFilmId} />
              ))}
            </div>
          ) : (
            <p className="my-[80px] text-[17px] text-muted">No franchises logged yet.</p>
          ))}

        {showingStudios &&
          (studios.length > 0 ? (
            <div className="mt-[64px] flex flex-col gap-[96px]">
              {studios.map((studio) => (
                <FilmGroupSection key={studio.id} group={studio} imageByFilmId={imageByFilmId} />
              ))}
            </div>
          ) : (
            <p className="my-[80px] text-[17px] text-muted">No studios logged yet.</p>
          ))}
      </main>

      <SiteFooter />

      {isOwner && <AddTitleButton onClick={() => setIsAddingTitle(true)} />}

      {isAddingTitle ? (
        <AddTitleModal
          onClose={() => setIsAddingTitle(false)}
          // Both pickers' options come from the groups already fetched for the
          // grouped views, so opening the modal costs no extra query.
          existingFranchises={franchises.map((franchise) => franchise.name)}
          existingStudios={studios.map((studio) => studio.name)}
        />
      ) : null}
    </div>
  );
}
