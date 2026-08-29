"use client";

import { useState } from "react";
import { CategoryChips } from "@/components/film-index/CategoryChips";
import { FilmCard } from "@/components/film-index/FilmCard";
import { SortControls } from "@/components/film-index/SortControls";
import type { FilmCategory, FilmSummary } from "@/lib/types";

const SAMPLE_FILMS: FilmSummary[] = [
  { id: "1", slug: "the-dark-knight-2008", title: "The Dark Knight", year: 2008, director: "Christopher Nolan", posterKey: null, categories: ["Movies"], franchiseId: null },
  { id: "2", slug: "spirited-away-2001", title: "Spirited Away", year: 2001, director: "Hayao Miyazaki", posterKey: null, categories: ["Animation", "Movies"], franchiseId: null },
  { id: "3", slug: "wont-you-be-my-neighbor-2018", title: "Won't You Be My Neighbor?", year: 2018, director: null, posterKey: null, categories: ["Documentaries"], franchiseId: null },
];

export default function FilmIndexPage() {
  const [selectedCategories, setSelectedCategories] = useState<(FilmCategory | "Franchises")[]>([]);
  const [sortBy, setSortBy] = useState<"year" | "title">("year");

  function toggleCategory(category: FilmCategory | "Franchises") {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]
    );
  }

  return (
    <main className="flex flex-col gap-8pt-5 px-[40px] py-8pt-5">
      <h1 className="text-4xl font-medium tracking-[-0.045em]">Task 8 probe</h1>
      <div className="flex flex-wrap items-center justify-between gap-[24px] pb-[18px]">
        <CategoryChips selected={selectedCategories} onToggle={toggleCategory} onClearAll={() => setSelectedCategories([])} />
        <SortControls sortBy={sortBy} onChange={setSortBy} />
      </div>
      <p className="text-sm text-muted">
        selected: [{selectedCategories.join(", ")}] · sortBy: {sortBy}
      </p>
      <div className="grid gap-[76px_40px] [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
        {SAMPLE_FILMS.map((film) => (
          <FilmCard key={film.id} film={film} imageUrl={null} />
        ))}
      </div>
    </main>
  );
}
