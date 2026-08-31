import { describe, expect, it } from "vitest";
import { normalizeSaveFilmInput } from "@/lib/films/saveFilmInput";

const VALID = {
  title: "Inception",
  year: 2010,
  director: "Christopher Nolan",
  categories: ["Movies"] as const,
  cast: [{ name: "Leonardo DiCaprio", role: "Dom Cobb" }],
  franchiseName: null,
};

function input(overrides: Record<string, unknown> = {}) {
  // Cast through unknown deliberately: a Server Action's arguments arrive over
  // the wire, so the compile-time types are a claim, not a guarantee.
  return { ...VALID, ...overrides } as unknown as Parameters<typeof normalizeSaveFilmInput>[0];
}

describe("normalizeSaveFilmInput", () => {
  it("trims the fields that reach the database", () => {
    const result = normalizeSaveFilmInput(input({ title: "  Inception  ", director: "  Nolan  " }));
    expect(result.title).toBe("Inception");
    expect(result.director).toBe("Nolan");
  });

  it("rejects a title that is empty or only whitespace", () => {
    expect(() => normalizeSaveFilmInput(input({ title: "   " }))).toThrow("Title is required");
    expect(() => normalizeSaveFilmInput(input({ title: "" }))).toThrow("Title is required");
  });

  it("stores several directors comma-separated, tidied", () => {
    expect(normalizeSaveFilmInput(input({ director: "  Joel Coen ,,Ethan Coen  " })).director).toBe(
      "Joel Coen, Ethan Coen"
    );
  });

  it("turns an empty director into null rather than an empty string", () => {
    expect(normalizeSaveFilmInput(input({ director: "   " })).director).toBeNull();
  });

  // film_cast is PRIMARY KEY (film_id, person_id), so the same person twice
  // aborts the whole insert. TMDB does return an actor credited in two roles.
  it("drops duplicate cast members, keeping the first credit", () => {
    const result = normalizeSaveFilmInput(
      input({
        cast: [
          { name: "Andy Serkis", role: "Gollum" },
          { name: "Andy Serkis", role: "Sméagol" },
          { name: "Elijah Wood", role: "Frodo" },
        ],
      })
    );
    expect(result.cast).toEqual([
      { personName: "Andy Serkis", role: "Gollum", tmdbPersonId: null },
      { personName: "Elijah Wood", role: "Frodo", tmdbPersonId: null },
    ]);
  });

  // Identity is the TMDB person id wherever there is one, so a person credited
  // twice collapses even if TMDB spells the name differently between credits.
  it("de-duplicates on the TMDB person id rather than the name", () => {
    const result = normalizeSaveFilmInput(
      input({
        cast: [
          { name: "Andy Serkis", role: "Gollum", tmdbPersonId: 1907 },
          { name: "Andy Serkis", role: "Sméagol", tmdbPersonId: 1907 },
        ],
      })
    );
    expect(result.cast).toEqual([{ personName: "Andy Serkis", role: "Gollum", tmdbPersonId: 1907 }]);
  });

  // The whole point of keying on the id: two different working actors share a
  // name often enough that merging them would fabricate a network edge.
  it("keeps two same-named people apart when their TMDB ids differ", () => {
    const result = normalizeSaveFilmInput(
      input({
        cast: [
          { name: "Chris Evans", role: "Steve Rogers", tmdbPersonId: 16828 },
          { name: "Chris Evans", role: "Himself", tmdbPersonId: 1223786 },
        ],
      })
    );
    expect(result.cast).toEqual([
      { personName: "Chris Evans", role: "Steve Rogers", tmdbPersonId: 16828 },
      { personName: "Chris Evans", role: "Himself", tmdbPersonId: 1223786 },
    ]);
  });

  it("discards a tmdbPersonId that is not a positive integer", () => {
    const result = normalizeSaveFilmInput(
      input({ cast: [{ name: "Real", role: "", tmdbPersonId: "1907; drop table people" }] })
    );
    expect(result.cast).toEqual([{ personName: "Real", role: "", tmdbPersonId: null }]);
  });

  it("drops cast entries with no name", () => {
    const result = normalizeSaveFilmInput(input({ cast: [{ name: "  ", role: "Extra" }, { name: "Real", role: "" }] }));
    expect(result.cast).toEqual([{ personName: "Real", role: "", tmdbPersonId: null }]);
  });

  it("defaults to Movies when no category is chosen, matching the design", () => {
    expect(normalizeSaveFilmInput(input({ categories: [] })).categories).toEqual(["Movies"]);
  });

  it("discards categories outside the film_category enum", () => {
    const result = normalizeSaveFilmInput(input({ categories: ["Movies", "Franchises", "Hacked"] }));
    expect(result.categories).toEqual(["Movies"]);
  });

  it("de-duplicates repeated categories", () => {
    expect(normalizeSaveFilmInput(input({ categories: ["Movies", "Movies"] })).categories).toEqual(["Movies"]);
  });

  it("accepts a null year and a future release year", () => {
    expect(normalizeSaveFilmInput(input({ year: null })).year).toBeNull();
    // The design's own lookup carries Spider-Man: Beyond the Spider-Verse (2027).
    expect(normalizeSaveFilmInput(input({ year: 2027 })).year).toBe(2027);
  });

  it("rejects a year that is not a plausible release year", () => {
    expect(() => normalizeSaveFilmInput(input({ year: 1500 }))).toThrow("Year");
    expect(() => normalizeSaveFilmInput(input({ year: 9999 }))).toThrow("Year");
    expect(() => normalizeSaveFilmInput(input({ year: 2010.5 }))).toThrow("Year");
    expect(() => normalizeSaveFilmInput(input({ year: Number.NaN }))).toThrow("Year");
  });

  // The design's franchise control is a combobox: pick an existing name or type
  // a new one. Either way the action receives a name, never an id.
  it("trims a franchise name and treats blank as standalone", () => {
    expect(normalizeSaveFilmInput(input({ franchiseName: "  Alien  " })).franchiseName).toBe("Alien");
    expect(normalizeSaveFilmInput(input({ franchiseName: "   " })).franchiseName).toBeNull();
    expect(normalizeSaveFilmInput(input({ franchiseName: null })).franchiseName).toBeNull();
  });
});
