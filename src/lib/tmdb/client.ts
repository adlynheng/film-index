import type { FilmCategory } from "@/lib/types";

export interface TmdbSearchResult {
  title: string;
  year: number | null;
  director: string;
  categories: FilmCategory[];
  cast: { name: string; role: string; tmdbPersonId: number }[];
  posterUrl: string | null;
}

interface TmdbMultiSearchItem {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbDetail {
  genres?: { id: number }[];
  poster_path?: string | null;
  created_by?: { name: string }[];
  credits?: {
    cast?: { id: number; name: string; character: string }[];
    crew?: { name: string; job: string }[];
  };
}

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w780";

// TMDB genre ids, stable across both the movie and tv lists.
const TMDB_ANIMATION_GENRE_ID = 16;
const TMDB_DOCUMENTARY_GENRE_ID = 99;

const MAX_RESULTS = 8;
const MAX_CAST_MEMBERS = 8;

/**
 * Note the Bearer scheme: TMDB_API_KEY must be the v4 **API Read Access
 * Token** from the TMDB account settings, not the shorter v3 API key. The v3
 * key is passed as an `api_key` query parameter instead and returns 401 here.
 */
async function tmdbFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");
  const response = await fetch(`${TMDB_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function toCategories(mediaType: "movie" | "tv", genres: { id: number }[]): FilmCategory[] {
  const genreIds = genres.map((genre) => genre.id);
  return [
    mediaType === "movie" ? "Movies" : "TV shows",
    ...(genreIds.includes(TMDB_ANIMATION_GENRE_ID) ? (["Animation"] as const) : []),
    ...(genreIds.includes(TMDB_DOCUMENTARY_GENRE_ID) ? (["Documentaries"] as const) : []),
  ];
}

function toDirector(mediaType: "movie" | "tv", detail: TmdbDetail): string {
  // Every credited director, in TMDB's own order: co-directed films are common
  // enough (the Coens, the Russos, half of animation) that taking the first
  // name alone quietly mis-credits them. The join is the stored form, which
  // `formatDirectors` turns into the middle-dot list on screen.
  const creditedDirectors = (detail.credits?.crew ?? [])
    .filter((crewMember) => crewMember.job === "Director")
    .map((crewMember) => crewMember.name);
  // Deduplicated: TMDB lists a director twice where they are credited in two
  // departments.
  const directors = Array.from(new Set(creditedDirectors));
  if (directors.length > 0) return directors.join(", ");

  // A series usually has no crew member with job "Director" — the showrunners
  // are in `created_by`, which is what the index means by a series' director.
  if (mediaType === "tv") return (detail.created_by ?? []).map((creator) => creator.name).join(", ");
  return "";
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const searchResponse = await tmdbFetch<{ results: TmdbMultiSearchItem[] }>(
    `/search/multi?include_adult=false&query=${encodeURIComponent(query)}`
  );

  const candidates = searchResponse.results.filter(
    (item): item is TmdbMultiSearchItem & { media_type: "movie" | "tv" } =>
      item.media_type === "movie" || item.media_type === "tv"
  );

  return Promise.all(
    candidates.slice(0, MAX_RESULTS).map(async (item) => {
      // One request per candidate rather than two: `append_to_response` folds
      // the credits into the detail payload, which also carries the genres and
      // poster the search row alone does not reliably provide.
      const detail = await tmdbFetch<TmdbDetail>(`/${item.media_type}/${item.id}?append_to_response=credits`);
      const releaseDate = item.release_date ?? item.first_air_date;

      return {
        title: item.title ?? item.name ?? "",
        year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
        director: toDirector(item.media_type, detail),
        categories: toCategories(item.media_type, detail.genres ?? []),
        cast: (detail.credits?.cast ?? [])
          .slice(0, MAX_CAST_MEMBERS)
          // The id travels with the credit because names are not unique:
          // `people` is keyed on it so two same-named actors stay two nodes.
          .map((castMember) => ({
            name: castMember.name,
            role: castMember.character,
            tmdbPersonId: castMember.id,
          })),
        posterUrl: detail.poster_path ? `${TMDB_IMAGE_BASE_URL}${detail.poster_path}` : null,
      };
    })
  );
}
