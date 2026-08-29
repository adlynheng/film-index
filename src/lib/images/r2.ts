import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { FRAME_WIDTHS, type FrameWidth } from "@/lib/images/frameWidths";

const CACHE_CONTROL_ONE_YEAR_IMMUTABLE = "public, max-age=31536000, immutable";

// The rung used for the plain `src`, which only browsers without srcset
// support ever fetch. Every current browser uses the srcset instead.
const FALLBACK_WIDTH: FrameWidth = 1280;

export interface FilmImage {
  src: string;
  srcSet: string;
}

/**
 * `poster_key` (spec §5) stores only the *base* key, e.g. `frames/<film-id>`.
 * Every variant's object key is derived from it by convention, so adding or
 * removing a rung never touches the database schema.
 */
function buildObjectKey(baseKey: string, width: FrameWidth): string {
  return `${baseKey}-${width}.webp`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export async function uploadFilmFrame(baseKey: string, width: FrameWidth, buffer: Buffer): Promise<void> {
  const r2Client = getR2Client();
  await r2Client.send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: buildObjectKey(baseKey, width),
      Body: buffer,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL_ONE_YEAR_IMMUTABLE,
    })
  );
}

export function buildImageUrl(baseKey: string | null, width: FrameWidth): string | null {
  if (!baseKey) return null;
  return `https://${process.env.NEXT_PUBLIC_IMAGE_DOMAIN}/${buildObjectKey(baseKey, width)}`;
}

/**
 * Safe to call from a Client Component: it touches only the NEXT_PUBLIC_ domain
 * and never the S3 client above, so the AWS SDK tree-shakes out of the client
 * bundle (verified in Task 16 — the client JS grew 115 bytes and contains no
 * S3 code). Keep it that way; referencing anything S3-side from here would
 * silently pull the whole SDK into the browser.
 */
export function buildFilmImage(baseKey: string | null): FilmImage | null {
  if (!baseKey) return null;
  return {
    src: buildImageUrl(baseKey, FALLBACK_WIDTH)!,
    srcSet: FRAME_WIDTHS.map((width) => `${buildImageUrl(baseKey, width)} ${width}w`).join(", "),
  };
}
