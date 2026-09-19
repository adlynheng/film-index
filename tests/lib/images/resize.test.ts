import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { FRAME_WIDTHS } from "@/lib/images/frameWidths";
import { resizeFilmFrame } from "@/lib/images/resize";

async function makeSourceImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 40, b: 38 } },
  })
    .jpeg()
    .toBuffer();
}

describe("resizeFilmFrame", () => {
  // The real upload shape: a 2.40:1 scope frame at 1280x533.
  it("produces one WebP variant per rung at the intended widths", async () => {
    const variants = await resizeFilmFrame(await makeSourceImage(1280, 533));

    expect(variants.map((variant) => variant.width)).toEqual([...FRAME_WIDTHS]);
    for (const variant of variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(variant.width);
      expect(variant.contentType).toBe("image/webp");
    }
  });

  it("preserves the source aspect ratio", async () => {
    const variants = await resizeFilmFrame(await makeSourceImage(1280, 533));
    for (const variant of variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.width! / meta.height!).toBeCloseTo(1280 / 533, 2);
    }
  });

  // Upscaling a small source produces a blurry image that is also *larger* on
  // disk than the original — worse on both axes. The rung's file is still
  // written, it just caps at the source's own width.
  it("does not enlarge a source narrower than a rung", async () => {
    const variants = await resizeFilmFrame(await makeSourceImage(600, 250));
    const widths = await Promise.all(
      variants.map(async (variant) => (await sharp(variant.buffer).metadata()).width)
    );
    expect(widths).toEqual([480, 600, 600, 600]);
  });

  it("orders variants smallest first, so the srcset reads in ascending order", async () => {
    const variants = await resizeFilmFrame(await makeSourceImage(1280, 533));
    const widths = variants.map((variant) => variant.width);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
  });
});
