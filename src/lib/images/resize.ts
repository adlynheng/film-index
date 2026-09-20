import sharp from "sharp";
import { FRAME_WIDTHS, type FrameWidth } from "@/lib/images/frameWidths";


export interface ImageVariant {
  width: FrameWidth;
  buffer: Buffer;
  contentType: "image/webp";
}

// Quality tracks how hard a rung is squeezed on the way to the screen rather
// than how wide it is. Everything up to 1280 is resampled down into a box
// narrower than itself, and that resampling averages artefacts away, so those
// rungs can afford less. The top two feed the detail hero at roughly 1:1 on a
// 2x display, where nothing hides anything — so the curve climbs again.
const QUALITY_BY_WIDTH: Record<FrameWidth, number> = {
  480: 82,
  720: 81,
  960: 80,
  1280: 78,
  1920: 82,
  2560: 82,
};

export async function resizeFilmFrame(sourceBuffer: Buffer): Promise<ImageVariant[]> {
  // rotate() applies the EXIF orientation flag before resizing, so a frame
  // grabbed on a phone is not stored on its side. withoutEnlargement stops a
  // source narrower than a rung being upscaled into a blurry variant that is
  // also heavier on disk than the original — the file is still written at that
  // rung's key, it is simply smaller than the rung's nominal width.
  return Promise.all(
    FRAME_WIDTHS.map(async (width) => ({
      width,
      buffer: await sharp(sourceBuffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY_BY_WIDTH[width] })
        .toBuffer(),
      contentType: "image/webp" as const,
    }))
  );
}
