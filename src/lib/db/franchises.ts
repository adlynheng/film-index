import { sql } from "@/lib/db/client";
import { listFilms } from "@/lib/db/films";
import type { Franchise } from "@/lib/types";

export async function listFranchisesWithFilms(): Promise<Franchise[]> {
  const franchiseRows = await sql<{ id: string; name: string }[]>`
    select id, name from franchises order by name
  `;
  const allFilms = await listFilms();

  return franchiseRows.map((franchiseRow) => ({
    id: franchiseRow.id,
    name: franchiseRow.name,
    films: allFilms
      .filter((film) => film.franchiseId === franchiseRow.id)
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
  }));
}
