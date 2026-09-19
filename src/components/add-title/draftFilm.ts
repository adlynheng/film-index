import type { FilmCategory } from "@/lib/types";

/**
 * The dialog's own working copy of a film. Pure types and helpers, kept out of
 * the components so the manual-entry fields and the modal agree on one shape.
 *
 * A cast row differs from `TmdbSearchResult["cast"]` in one way that matters:
 * `tmdbPersonId` is nullable. A row typed by hand has no TMDB identity, and a
 * TMDB row whose name has been edited has given its identity up — see the note
 * in ManualDetailsFields.
 */
export interface DraftCastMember {
  name: string;
  role: string;
  tmdbPersonId: number | null;
}

export interface DraftFilm {
  title: string;
  year: number | null;
  director: string;
  categories: FilmCategory[];
  cast: DraftCastMember[];
  franchiseName: string | null;
  studioName: string | null;
}

// Matches the design's emptyDraft, which starts on "Movies" rather than on no
// category at all — the same fallback saveFilmInput applies server-side.
export const EMPTY_DRAFT: DraftFilm = {
  title: "",
  year: null,
  director: "",
  categories: ["Movies"],
  cast: [],
  franchiseName: null,
  studioName: null,
};
