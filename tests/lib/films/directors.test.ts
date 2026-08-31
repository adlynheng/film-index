import { describe, expect, it } from "vitest";
import { formatDirectors, normalizeDirectors, parseDirectors } from "@/lib/films/directors";

describe("parseDirectors", () => {
  it("reads one name as one director", () => {
    expect(parseDirectors("Christopher Nolan")).toEqual(["Christopher Nolan"]);
  });

  it("splits the stored form on commas and trims each name", () => {
    expect(parseDirectors("Joel Coen,  Ethan Coen ")).toEqual(["Joel Coen", "Ethan Coen"]);
  });

  it("drops the blanks a stray or trailing comma leaves", () => {
    expect(parseDirectors("Joel Coen,, Ethan Coen,")).toEqual(["Joel Coen", "Ethan Coen"]);
  });

  it("has no directors for null, empty or whitespace", () => {
    expect(parseDirectors(null)).toEqual([]);
    expect(parseDirectors("")).toEqual([]);
    expect(parseDirectors("   ,  ")).toEqual([]);
  });
});

describe("normalizeDirectors", () => {
  it("stores the names comma-separated, one space after each comma", () => {
    expect(normalizeDirectors("  Joel Coen ,,Ethan Coen  ")).toBe("Joel Coen, Ethan Coen");
  });

  it("is null where no name survives, so the column stays empty rather than blank", () => {
    expect(normalizeDirectors("   ")).toBeNull();
    expect(normalizeDirectors(",")).toBeNull();
    expect(normalizeDirectors(null)).toBeNull();
  });

  // A name kept for display can be re-normalized without drifting.
  it("leaves an already canonical value alone", () => {
    expect(normalizeDirectors("Joel Coen, Ethan Coen")).toBe("Joel Coen, Ethan Coen");
  });
});

describe("formatDirectors", () => {
  it("joins the names with a middle dot", () => {
    expect(formatDirectors("Anthony Russo, Joe Russo")).toBe("Anthony Russo · Joe Russo");
  });

  it("leaves a single director as the name alone", () => {
    expect(formatDirectors("Christopher Nolan")).toBe("Christopher Nolan");
  });

  it("is empty where there is nothing to show, so callers can fall back", () => {
    expect(formatDirectors(null)).toBe("");
    expect(formatDirectors(" , ")).toBe("");
  });
});
