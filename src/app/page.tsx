"use client";

import { Chip } from "@/components/shared/Chip";

export default function FilmIndexPage() {
  return (
    <main className="flex flex-col gap-8pt-3 p-8pt-5">
      <h1 className="text-2xl">Chip probe</h1>
      <div className="flex flex-wrap gap-2">
        <Chip label="Movies" active={false} onClick={() => {}} />
        <Chip label="TV shows" active onClick={() => {}} />
        <Chip label="Animation" active={false} onClick={() => {}} />
      </div>
    </main>
  );
}
