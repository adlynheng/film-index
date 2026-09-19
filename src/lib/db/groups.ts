import { sql } from "@/lib/db/client";
import type { FilmGroup, FilmSummary } from "@/lib/types";

/**
 * The two ways films are grouped on the index. They are separate tables of the
 * same shape, so one function reads either — see `resolveGroupId` in films.ts
 * for the write side.
 */
export type GroupKind = "franchise" | "studio";

const TABLE_BY_KIND: Record<GroupKind, "franchises" | "studios"> = {
  franchise: "franchises",
  studio: "studios",
};

/**
 * Every group of one kind, each carrying its films oldest-first.
 *
 * The films are passed in rather than queried again: the index page already
 * holds the full list for the flat grid, and both grouped views are just that
 * list re-sliced.
 */
export async function listGroupsWithFilms(kind: GroupKind, films: FilmSummary[]): Promise<FilmGroup[]> {
  const groupRows = await sql<{ id: string; name: string }[]>`
    select id, name from ${sql(TABLE_BY_KIND[kind])} order by name
  `;

  return groupRows.map((groupRow) => ({
    id: groupRow.id,
    name: groupRow.name,
    films: films
      .filter((film) => (kind === "franchise" ? film.franchiseId : film.studioId) === groupRow.id)
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
  }));
}
