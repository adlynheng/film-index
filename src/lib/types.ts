export type FilmCategory = "Movies" | "TV shows" | "Animation" | "Documentaries";

// The index's chip row mixes categories with the two grouped views, which are
// not categories at all: picking one swaps the flat grid for sections.
export type ChipFilter = FilmCategory | "Franchises" | "Studios";

export interface CastCredit {
  personId: string;
  name: string;
  role: string;
}

export interface FilmSummary {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  director: string | null;
  posterKey: string | null;
  categories: FilmCategory[];
  franchiseId: string | null;
  studioId: string | null;
}

export interface FilmDetail extends FilmSummary {
  cast: CastCredit[];
  // The detail page's "Filed under" lists the categories *and* the groupings a
  // film belongs to, so both names are resolved alongside the film itself.
  franchiseName: string | null;
  studioName: string | null;
}

/**
 * A named set of films: a franchise, or a studio. The two are the same shape
 * and render through the same section, which is what makes the Studios view
 * identical to the Franchises one.
 */
export interface FilmGroup {
  id: string;
  name: string;
  films: FilmSummary[];
}
