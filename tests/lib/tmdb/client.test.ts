import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchTmdb } from "@/lib/tmdb/client";

/**
 * TMDB is stubbed at the `fetch` boundary: these tests cover the normalization
 * from TMDB's shape into `TmdbSearchResult`, which is the part Task 17 depends
 * on. They deliberately do not hit the network.
 */
function stubTmdb(routes: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const path = url.replace("https://api.themoviedb.org/3", "");
    const matched = Object.keys(routes).find((route) => path.startsWith(route));
    if (!matched) throw new Error(`unstubbed TMDB path: ${path}`);
    return { ok: true, status: 200, json: async () => routes[matched] };
  });
}

const MOVIE_DETAIL = {
  genres: [{ id: 28 }],
  poster_path: "/poster.jpg",
  credits: {
    cast: [{ name: "Leonardo DiCaprio", character: "Dom Cobb" }],
    crew: [{ name: "Christopher Nolan", job: "Director" }],
  },
};

beforeEach(() => {
  vi.stubEnv("TMDB_API_KEY", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("searchTmdb", () => {
  it("normalizes a movie result", async () => {
    vi.stubGlobal(
      "fetch",
      stubTmdb({
        "/search/multi": {
          results: [{ id: 27205, media_type: "movie", title: "Inception", release_date: "2010-07-15" }],
        },
        "/movie/27205": MOVIE_DETAIL,
      })
    );

    const [result] = await searchTmdb("inception");
    expect(result.title).toBe("Inception");
    expect(result.year).toBe(2010);
    expect(result.director).toBe("Christopher Nolan");
    expect(result.categories).toEqual(["Movies"]);
    expect(result.cast).toEqual([{ name: "Leonardo DiCaprio", role: "Dom Cobb" }]);
    expect(result.posterUrl).toBe("https://image.tmdb.org/t/p/w780/poster.jpg");
  });

  it("drops person results, which /search/multi mixes in", async () => {
    vi.stubGlobal(
      "fetch",
      stubTmdb({
        "/search/multi": {
          results: [
            { id: 1, media_type: "person", name: "Christopher Nolan" },
            { id: 27205, media_type: "movie", title: "Inception", release_date: "2010-07-15" },
          ],
        },
        "/movie/27205": MOVIE_DETAIL,
      })
    );

    const results = await searchTmdb("nolan");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Inception");
  });

  // TV shows rarely carry a crew member with job "Director" — the showrunner
  // lives in `created_by`. Reading only crew leaves the design's "year · director"
  // meta line rendering as "2022 · " for most series.
  it("falls back to created_by for a TV show's director", async () => {
    vi.stubGlobal(
      "fetch",
      stubTmdb({
        "/search/multi": {
          results: [{ id: 95396, media_type: "tv", name: "Severance", first_air_date: "2022-02-18" }],
        },
        "/tv/95396": {
          genres: [{ id: 18 }],
          poster_path: null,
          created_by: [{ name: "Dan Erickson" }],
          credits: { cast: [], crew: [] },
        },
      })
    );

    const [result] = await searchTmdb("severance");
    expect(result.director).toBe("Dan Erickson");
    expect(result.categories).toEqual(["TV shows"]);
    expect(result.posterUrl).toBeNull();
  });

  it("derives Animation and Documentaries from TMDB genres", async () => {
    vi.stubGlobal(
      "fetch",
      stubTmdb({
        "/search/multi": {
          results: [{ id: 324857, media_type: "movie", title: "Into the Spider-Verse", release_date: "2018-12-14" }],
        },
        "/movie/324857": { ...MOVIE_DETAIL, genres: [{ id: 16 }, { id: 99 }] },
      })
    );

    const [result] = await searchTmdb("spider");
    expect(result.categories).toEqual(["Movies", "Animation", "Documentaries"]);
  });

  it("returns a null year when TMDB has no release date", async () => {
    vi.stubGlobal(
      "fetch",
      stubTmdb({
        "/search/multi": { results: [{ id: 7, media_type: "movie", title: "Untitled" }] },
        "/movie/7": MOVIE_DETAIL,
      })
    );

    const [result] = await searchTmdb("untitled");
    expect(result.year).toBeNull();
  });

  it("throws a clear error when the API key is missing", async () => {
    vi.stubEnv("TMDB_API_KEY", "");
    vi.stubGlobal("fetch", stubTmdb({ "/search/multi": { results: [] } }));
    await expect(searchTmdb("inception")).rejects.toThrow("TMDB_API_KEY is not set");
  });
});
