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
}

export interface Franchise {
  id: string;
  name: string;
  films: FilmSummary[];
}
