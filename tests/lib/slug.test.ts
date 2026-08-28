import { describe, expect, it } from "vitest";
import { buildFilmSlug, generateUniqueFilmSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("The Dark Knight")).toBe("the-dark-knight");
  });

  it("strips punctuation", () => {
    expect(slugify("Lock, Stock and Two Smoking Barrels")).toBe("lock-stock-and-two-smoking-barrels");
  });

  it("trims leading and trailing hyphens produced by punctuation", () => {
    expect(slugify("(Untitled)")).toBe("untitled");
  });

  it("folds accented characters down to their base letter", () => {
    expect(slugify("Alfonso Cuarón")).toBe("alfonso-cuaron");
    expect(slugify("Stellan Skarsgård")).toBe("stellan-skarsgard");
  });
});

describe("buildFilmSlug", () => {
  it("appends the year when present", () => {
    expect(buildFilmSlug("Dune", 2021)).toBe("dune-2021");
  });

  it("omits the year when absent", () => {
    expect(buildFilmSlug("Dune", null)).toBe("dune");
  });
});

describe("generateUniqueFilmSlug", () => {
  it("returns the base slug when it's free", async () => {
    const slug = await generateUniqueFilmSlug("Dune", 2021, async () => false);
    expect(slug).toBe("dune-2021");
  });

  it("appends a numeric suffix on collision", async () => {
    const taken = new Set(["dune-2021", "dune-2021-2"]);
    const slug = await generateUniqueFilmSlug("Dune", 2021, async (candidate) => taken.has(candidate));
    expect(slug).toBe("dune-2021-3");
  });
});
