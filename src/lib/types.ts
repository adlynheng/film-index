export type FilmCategory = "Movies" | "TV shows" | "Animation" | "Documentaries";

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
}

export interface FilmDetail extends FilmSummary {
  cast: CastCredit[];
  // The detail page's "Filed under" lists the categories *and* the franchise
  // name, so the franchise has to be resolved alongside the film itself.
  franchiseName: string | null;
}

export interface Franchise {
  id: string;
  name: string;
  films: FilmSummary[];
}
