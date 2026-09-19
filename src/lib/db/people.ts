import { sql } from "@/lib/db/client";

export interface PersonSuggestion {
  id: string;
  name: string;
  // Null for people who arrived without one — seed rows and hand-entered
  // credits. A suggestion carries it so picking a name adopts that person's
  // identity rather than minting a second row beside them.
  tmdbPersonId: number | null;
  filmCount: number;
}

const SUGGESTION_LIMIT = 8;

/**
 * Names already in the index, for the cast fields' combobox.
 *
 * The film count rides along because two rows can legitimately share a name —
 * that is the whole reason identity is keyed on `tmdb_person_id` — and without
 * it a duplicate pair would be two identical, unpickable lines in the list.
 */
export async function searchPeopleByName(query: string): Promise<PersonSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  // `_` and `%` are wildcards to LIKE, so a typed "%" would otherwise match
  // every person in the index. Escaped against the default backslash escape.
  const pattern = trimmed.replace(/[\\%_]/g, "\\$&");

  const rows = await sql<{ id: string; name: string; tmdb_person_id: number | null; film_count: number }[]>`
    select p.id, p.name, p.tmdb_person_id, count(fc.film_id)::int as film_count
    from people p
    left join film_cast fc on fc.person_id = p.id
    where p.name ilike ${`%${pattern}%`}
    group by p.id, p.name, p.tmdb_person_id
    -- Prefix matches first: typing "chris" should offer Chris Evans before
    -- Christopher Nolan's namesakes buried mid-string.
    order by case when p.name ilike ${`${pattern}%`} then 0 else 1 end, p.name
    limit ${SUGGESTION_LIMIT}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tmdbPersonId: row.tmdb_person_id,
    filmCount: row.film_count,
  }));
}
