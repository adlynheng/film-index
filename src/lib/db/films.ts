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
  };
}

export async function listFilms(): Promise<FilmSummary[]> {
  const rows = await sql<FilmRow[]>`select * from films order by year desc nulls last`;
  const categoriesByFilmId = await attachCategories(rows);
  return rows.map((row) => toFilmSummary(row, categoriesByFilmId.get(row.id) ?? []));
}

export async function getFilmBySlug(slug: string): Promise<FilmDetail | null> {
  const [row] = await sql<FilmRow[]>`select * from films where slug = ${slug} limit 1`;
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

  return { ...toFilmSummary(row, categoriesByFilmId.get(row.id) ?? []), cast };
}

export async function filmSlugExists(candidateSlug: string): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    select exists(select 1 from films where slug = ${candidateSlug}) as exists
  `;
  return row.exists;
}

export interface InsertFilmParams {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  posterKey: string | null;
  franchiseId: string | null;
  categories: FilmCategory[];
  cast: { personName: string; role: string }[];
}

export async function insertFilm(params: InsertFilmParams): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`
      insert into films (id, slug, title, year, director, poster_key, franchise_id)
      values (${params.id}, ${params.slug}, ${params.title}, ${params.year}, ${params.director}, ${params.posterKey}, ${params.franchiseId})
    `;

    for (const category of params.categories) {
      await transaction`
        insert into film_categories (film_id, category) values (${params.id}, ${category})
      `;
    }

    for (const [index, castMember] of params.cast.entries()) {
      const [person] = await transaction<{ id: string }[]>`
        insert into people (name) values (${castMember.personName})
        on conflict (name) do update set name = excluded.name
        returning id
      `;
      await transaction`
        insert into film_cast (film_id, person_id, role, sort_order)
        values (${params.id}, ${person.id}, ${castMember.role}, ${index})
      `;
    }
  });
}
