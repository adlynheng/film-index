import sharp from "sharp";
import { FRAME_WIDTHS, type FrameWidth } from "@/lib/images/frameWidths";


export interface ImageVariant {
  width: FrameWidth;
  buffer: Buffer;
  contentType: "image/webp";
}

// Larger rungs keep more detail per byte, so quality can drop as width climbs.
const QUALITY_BY_WIDTH: Record<FrameWidth, number> = { 480: 82, 720: 81, 960: 80, 1280: 78 };

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
