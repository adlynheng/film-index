import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFilmImage, buildImageUrl } from "@/lib/images/r2";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_IMAGE_DOMAIN", "images.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildImageUrl", () => {
  it("derives each rung's object key from the single stored base key", () => {
    expect(buildImageUrl("frames/abc", 480)).toBe("https://images.example.com/frames/abc-480.webp");
    expect(buildImageUrl("frames/abc", 1280)).toBe("https://images.example.com/frames/abc-1280.webp");
  });

  it("returns null when the film has no poster key", () => {
    expect(buildImageUrl(null, 480)).toBeNull();
  });
});

describe("buildFilmImage", () => {
  it("builds a srcset covering every rung, with width descriptors", () => {
    const image = buildFilmImage("frames/abc")!;
    expect(image.srcSet).toBe(
      "https://images.example.com/frames/abc-480.webp 480w, " +
        "https://images.example.com/frames/abc-720.webp 720w, " +
        "https://images.example.com/frames/abc-960.webp 960w, " +
        "https://images.example.com/frames/abc-1280.webp 1280w, " +
        "https://images.example.com/frames/abc-1920.webp 1920w, " +
        "https://images.example.com/frames/abc-2560.webp 2560w"
    );
  });

  // Only browsers without srcset support ever fetch `src`; it should still be
  // a real, usable image rather than the smallest rung. Not the widest rung
  // either — a browser old enough to need this should not be handed 2560px.
  it("falls back to a mid rung for src", () => {
    expect(buildFilmImage("frames/abc")!.src).toBe("https://images.example.com/frames/abc-1280.webp");
  });

  it("returns null when the film has no poster key", () => {
    expect(buildFilmImage(null)).toBeNull();
  });
});
