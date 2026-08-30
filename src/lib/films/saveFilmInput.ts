import type { FilmCategory } from "@/lib/types";

/**
 * Lives outside the `"use server"` module on purpose: every export of a
 * `"use server"` file must be an async function, so a synchronous validator
 * cannot sit alongside the action itself.
 */

// Mirrors the film_category Postgres enum. "Franchises" is a filter chip in the
// UI, not a category, and must never reach film_categories.
const VALID_CATEGORIES: readonly FilmCategory[] = ["Movies", "TV shows", "Animation", "Documentaries"];

const EARLIEST_RELEASE_YEAR = 1888; // Roundhay Garden Scene, the oldest surviving film
const FUTURE_YEAR_ALLOWANCE = 5; // announced titles: the design's own lookup carries a 2027 release
const MAX_TITLE_LENGTH = 300;

export interface SaveFilmInput {
  title: string;
  year: number | null;
  director: string;
  categories: FilmCategory[];
  cast: { name: string; role: string }[];
  franchiseName: string | null;
  frameImageBytes: ArrayBuffer | null;
}

export interface NormalizedFilmInput {
  title: string;
  year: number | null;
  director: string | null;
  categories: FilmCategory[];
  cast: { personName: string; role: string }[];
  franchiseName: string | null;
}

/**
 * A Server Action is a public POST endpoint, so its arguments are untrusted
 * regardless of the declared types — the compile-time shape is a claim about
 * what the UI sends, not a guarantee about what arrives.
 */
export function normalizeSaveFilmInput(input: SaveFilmInput): NormalizedFilmInput {
  const title = String(input.title ?? "").trim();
  if (title.length === 0) throw new Error("Title is required");
  if (title.length > MAX_TITLE_LENGTH) throw new Error("Title is too long");

  const year = normalizeYear(input.year);

  const director = String(input.director ?? "").trim();

  const categories = Array.from(
    new Set((Array.isArray(input.categories) ? input.categories : []).filter(isFilmCategory))
  );

  // film_cast is PRIMARY KEY (film_id, person_id), so the same person credited
  // twice would abort the insert. TMDB does return actors in multiple roles.
  const seenPersonNames = new Set<string>();
  const cast: { personName: string; role: string }[] = [];
  for (const member of Array.isArray(input.cast) ? input.cast : []) {
    const personName = String(member?.name ?? "").trim();
    if (personName.length === 0 || seenPersonNames.has(personName)) continue;
    seenPersonNames.add(personName);
    cast.push({ personName, role: String(member?.role ?? "").trim() });
  }

  const franchiseName = String(input.franchiseName ?? "").trim();

  return {
    title,
    year,
    director: director.length > 0 ? director : null,
    // Matches the design's saveDraft, which falls back to ["Movies"].
    categories: categories.length > 0 ? categories : ["Movies"],
    cast,
    franchiseName: franchiseName.length > 0 ? franchiseName : null,
  };
}

function isFilmCategory(candidate: unknown): candidate is FilmCategory {
  return typeof candidate === "string" && (VALID_CATEGORIES as readonly string[]).includes(candidate);
}

function normalizeYear(year: number | null): number | null {
  if (year === null || year === undefined) return null;
  const latestAllowedYear = new Date().getFullYear() + FUTURE_YEAR_ALLOWANCE;
  if (!Number.isInteger(year) || year < EARLIEST_RELEASE_YEAR || year > latestAllowedYear) {
    throw new Error(`Year must be a whole number between ${EARLIEST_RELEASE_YEAR} and ${latestAllowedYear}`);
  }
  return year;
}
