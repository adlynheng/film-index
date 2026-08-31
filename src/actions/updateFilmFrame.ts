"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { getFilmFrameRef, updateFilmPosterKey } from "@/lib/db/films";
import { deleteFilmFrames, uploadFilmFrame } from "@/lib/images/r2";
import { resizeFilmFrame } from "@/lib/images/resize";

export interface UpdateFilmFrameInput {
  filmId: string;
  /** The new still, or null to leave the film with no frame at all. */
  frameImageBytes: ArrayBuffer | null;
}

/**
 * Replaces (or clears) the still on a film that already exists — the detail
 * page's in-place frame editor. `saveFilm` covers the first write; this covers
 * every one after it.
 */
export async function updateFilmFrame(input: UpdateFilmFrameInput): Promise<void> {
  // As in saveFilm: a Server Action is a public POST endpoint, so rendering the
  // editor only for the owner is not the boundary — this check is.
  const cookieStore = await cookies();
  if (!isOwnerRequest(cookieStore.get(OWNER_COOKIE_NAME)?.value)) {
    throw new Error("Not authorized to edit this frame");
  }

  const film = await getFilmFrameRef(input.filmId);
  if (!film) throw new Error("No such film");

  let posterKey: string | null = null;
  if (input.frameImageBytes) {
    // A fresh key per save, rather than overwriting the old one: the variants
    // are served `immutable` for a year, so a re-crop written to the same key
    // would keep showing the old still in every browser and CDN that had seen
    // it. The suffix is what makes the URL new.
    const baseKey = `frames/${input.filmId}-${randomBytes(4).toString("hex")}`;
    const variants = await resizeFilmFrame(Buffer.from(input.frameImageBytes));
    await Promise.all(variants.map((variant) => uploadFilmFrame(baseKey, variant.width, variant.buffer)));
    posterKey = baseKey;
  }

  await updateFilmPosterKey(input.filmId, posterKey);

  // Only once the row points somewhere else. The other order would blank the
  // page's frame if the update then failed, and orphaned objects are the
  // cheaper failure.
  if (film.posterKey && film.posterKey !== posterKey) {
    await deleteFilmFrames(film.posterKey);
  }

  revalidatePath("/");
  revalidatePath(`/films/${film.slug}`);
}
