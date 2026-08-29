"use client";

import { FilmGrid } from "@/components/film-index/FilmGrid";
import type { FilmSummary } from "@/lib/types";

const SAMPLE_FILMS: FilmSummary[] = Array.from({ length: 30 }, (_, index) => ({
  id: `film-${index}`,
  slug: `sample-film-${index}`,
  title: index % 4 === 0 ? `Sample Film With A Rather Long Title ${index}` : `Sample Film ${index}`,
  year: 2000 + index,
  director: `Director ${index}`,
  posterKey: null,
  categories: ["Movies"],
  franchiseId: null,
}));

export default function FilmIndexPage() {
  return (
    <main className="flex flex-col gap-8pt-3 px-[40px] py-8pt-5">
      <h1 className="text-4xl font-medium tracking-[-0.045em]">Task 9 probe — 30 films</h1>
      <FilmGrid films={SAMPLE_FILMS} imageUrlByFilmId={new Map()} />
    </main>
  );
}
