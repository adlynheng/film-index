import type { TransactionSql } from "postgres";
import { sql } from "@/lib/db/client";
import type { CastCredit, FilmCategory, FilmDetail, FilmSummary } from "@/lib/types";

interface FilmRow {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  poster_key: string | null;
  franchise_id: string | null;
  studio_id: string | null;
}

async function attachCategories(films: FilmRow[]): Promise<Map<string, FilmCategory[]>> {
  if (films.length === 0) return new Map();
  const filmIds = films.map((film) => film.id);
  const categoryRows = await sql<{ film_id: string; category: FilmCategory }[]>`
    select film_id, category from film_categories where film_id in ${sql(filmIds)}
  `;
  const categoriesByFilmId = new Map<string, FilmCategory[]>();
  for (const row of categoryRows) {
    const existing = categoriesByFilmId.get(row.film_id) ?? [];
    existing.push(row.category);
    categoriesByFilmId.set(row.film_id, existing);
  }
  return categoriesByFilmId;
}

function toFilmSummary(row: FilmRow, categories: FilmCategory[]): FilmSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    director: row.director,
    posterKey: row.poster_key,
    categories,
    franchiseId: row.franchise_id,
    studioId: row.studio_id,
  };
}

export async function listFilms(): Promise<FilmSummary[]> {
  const rows = await sql<FilmRow[]>`select * from films order by year desc nulls last`;
  const categoriesByFilmId = await attachCategories(rows);
  return rows.map((row) => toFilmSummary(row, categoriesByFilmId.get(row.id) ?? []));
}

export async function getFilmBySlug(slug: string): Promise<FilmDetail | null> {
  const [row] = await sql<(FilmRow & { franchise_name: string | null; studio_name: string | null })[]>`
    select f.*, fr.name as franchise_name, st.name as studio_name
    from films f
    left join franchises fr on fr.id = f.franchise_id
    left join studios st on st.id = f.studio_id
    where f.slug = ${slug}
    limit 1
  `;
  if (!row) return null;

  const categoriesByFilmId = await attachCategories([row]);
  const castRows = await sql<{ person_id: string; name: string; role: string | null }[]>`
    select p.id as person_id, p.name, fc.role
    from film_cast fc
    join people p on p.id = fc.person_id
    where fc.film_id = ${row.id}
    order by fc.sort_order
  `;
  const cast: CastCredit[] = castRows.map((castRow) => ({
    personId: castRow.person_id,
    name: castRow.name,
    role: castRow.role ?? "",
  }));

  return {
    ...toFilmSummary(row, categoriesByFilmId.get(row.id) ?? []),
    cast,
    franchiseName: row.franchise_name,
    studioName: row.studio_name,
  };
}

export async function filmSlugExists(candidateSlug: string): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists(select 1 from films where slug = ${candidateSlug}) as exists
  `;
  return row.exists;
}

// Postgres types `films.id` as uuid, so a malformed id raises a query error
// rather than simply missing. The frame editor takes its id from an untrusted
// request, so the lookup below turns a bad one into "no such film".
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FilmFrameRef {
  slug: string;
  posterKey: string | null;
}

/** Just enough of a film to re-point its frame: the key to clean up, and the path to revalidate. */
export async function getFilmFrameRef(filmId: string): Promise<FilmFrameRef | null> {
  if (!UUID_PATTERN.test(filmId)) return null;
  const [row] = await sql<{ slug: string; poster_key: string | null }[]>`
    select slug, poster_key from films where id = ${filmId} limit 1
  `;
  return row ? { slug: row.slug, posterKey: row.poster_key } : null;
}

/** Callers reach a film through `getFilmFrameRef` first, so the id is already known-good here. */
export async function updateFilmPosterKey(filmId: string, posterKey: string | null): Promise<void> {
  await sql`update films set poster_key = ${posterKey} where id = ${filmId}`;
}

export interface InsertFilmParams {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  posterKey: string | null;
  // Names, not ids: both grouping controls are comboboxes, so the caller may
  // name one that does not exist yet. Resolved or created inside the
  // transaction below.
  franchiseName: string | null;
  studioName: string | null;
  categories: FilmCategory[];
  cast: { personName: string; role: string; tmdbPersonId: number | null }[];
}

export async function insertFilm(params: InsertFilmParams): Promise<void> {
  await sql.begin(async (transaction) => {
    const franchiseId = await resolveGroupId(transaction, "franchises", params.franchiseName);
    const studioId = await resolveGroupId(transaction, "studios", params.studioName);

    await transaction`
      insert into films (id, slug, title, year, director, poster_key, franchise_id, studio_id)
      values (${params.id}, ${params.slug}, ${params.title}, ${params.year}, ${params.director}, ${params.posterKey}, ${franchiseId}, ${studioId})
    `;

    for (const category of params.categories) {
      await transaction`
        insert into film_categories (film_id, category) values (${params.id}, ${category})
      `;
    }

    for (const [index, castMember] of params.cast.entries()) {
      const personId = await resolvePersonId(transaction, castMember);
      await transaction`
        insert into film_cast (film_id, person_id, role, sort_order)
        values (${params.id}, ${personId}, ${castMember.role}, ${index})
      `;
    }
  });
}

/**
 * Finds or creates the row a grouping name refers to — a franchise or a
 * studio, which are the same shape in the schema and resolved the same way.
 *
 * The table name is a literal from this module, never caller input, so the
 * identifier interpolation carries no injection risk.
 */
async function resolveGroupId(
  transaction: TransactionSql,
  table: "franchises" | "studios",
  name: string | null
): Promise<string | null> {
  if (!name) return null;

  // Matched case-insensitively so typing "alien" does not create a second
  // franchise alongside "Alien". The unique index on name is case sensitive,
  // so it would happily allow the duplicate.
  const [existing] = await transaction<{ id: string }[]>`
    select id from ${transaction(table)} where lower(name) = lower(${name}) limit 1
  `;
  if (existing) return existing.id;

  const [created] = await transaction<{ id: string }[]>`
    insert into ${transaction(table)} (name) values (${name})
    on conflict (name) do update set name = excluded.name
    returning id
  `;
  return created.id;
}

/**
 * Finds or creates the `people` row a credit belongs to. This is the join that
 * builds the actor network: two actors are connected when they share a film,
 * so whether two credits resolve to one row or two decides whether an edge
 * exists at all.
 *
 * Identity is the TMDB person id wherever there is one. Names are not unique —
 * several working actors are called Chris Evans — and keying on the name would
 * merge them into one node carrying both of their filmographies.
 */
async function resolvePersonId(
  transaction: TransactionSql,
  castMember: { personName: string; tmdbPersonId: number | null }
): Promise<string> {
  if (castMember.tmdbPersonId === null) {
    // No id to key on, so the name is the only identity available. The unique
    // index this conflicts against is partial (`where tmdb_person_id is null`),
    // so it never collides with a TMDB-sourced row.
    const [person] = await transaction<{ id: string }[]>`
      insert into people (name) values (${castMember.personName})
      on conflict (name) where tmdb_person_id is null do update set name = excluded.name
      returning id
    `;
    return person.id;
  }

  // Seeded people carry no TMDB id, so the first time one of them is credited
  // from TMDB their existing row is claimed rather than duplicated — otherwise
  // seeded Cillian Murphy and TMDB Cillian Murphy would be two separate nodes.
  // A name-only row is an unresolved guess, so claiming can in principle
  // attach the id to a same-named stranger; that ambiguity is exactly what
  // having no id means, and every row claimed this way becomes unambiguous.
  const [claimed] = await transaction<{ id: string }[]>`
    update people set tmdb_person_id = ${castMember.tmdbPersonId}
    where name = ${castMember.personName} and tmdb_person_id is null
    returning id
  `;
  if (claimed) return claimed.id;

  const [person] = await transaction<{ id: string }[]>`
    insert into people (name, tmdb_person_id)
    values (${castMember.personName}, ${castMember.tmdbPersonId})
    on conflict (tmdb_person_id) do update set name = excluded.name
    returning id
  `;
  return person.id;
}
