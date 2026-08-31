import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { getFilmFrameRef } from "@/lib/db/films";
import { buildImageUrl } from "@/lib/images/r2";

// The widest rung stored, which is the most the crop editor can work from.
const SOURCE_WIDTH = 1280;

/**
 * The bytes of a film's stored frame, served from this origin.
 *
 * The detail page's frame editor draws the image onto a canvas to export the
 * crop, and a canvas that has drawn a cross-origin image is tainted — the
 * export would throw. The image domain sends no CORS headers (nothing else
 * needs them), so the bytes come back through here instead, where they are
 * same-origin and the canvas stays clean.
 *
 * Owner-only, like the editor it feeds.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isOwnerRequest(request.cookies.get(OWNER_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const filmId = request.nextUrl.searchParams.get("film");
  const film = filmId ? await getFilmFrameRef(filmId) : null;
  if (!film?.posterKey) {
    return NextResponse.json({ error: "No frame stored for this film" }, { status: 404 });
  }

  const upstream = await fetch(buildImageUrl(film.posterKey, SOURCE_WIDTH)!, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    console.error(`Fetching the stored frame failed: ${upstream.status}`);
    return NextResponse.json({ error: "Could not read the stored frame" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: { "content-type": "image/webp", "cache-control": "no-store" },
  });
}
