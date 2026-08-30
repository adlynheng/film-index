"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { filmSlugExists, insertFilm } from "@/lib/db/films";
import { normalizeSaveFilmInput, type SaveFilmInput } from "@/lib/films/saveFilmInput";
import { uploadFilmFrame } from "@/lib/images/r2";
import { resizeFilmFrame } from "@/lib/images/resize";
import { generateUniqueFilmSlug } from "@/lib/slug";

export async function saveFilm(input: SaveFilmInput): Promise<{ slug: string }> {
  // A Server Action is a public POST endpoint — rendering the "+" button only
  // for the owner is not a security boundary, so the cookie is checked here too.
  const cookieStore = await cookies();
  if (!isOwnerRequest(cookieStore.get(OWNER_COOKIE_NAME)?.value)) {
    throw new Error("Not authorized to add a title");
  }

  const film = normalizeSaveFilmInput(input);

  const filmId = randomUUID();
  const slug = await generateUniqueFilmSlug(film.title, film.year, filmSlugExists);

  // Uploaded before the insert: a failed upload should abort the whole save
  // rather than leave a row pointing at frames that were never written.
  let posterKey: string | null = null;
  if (input.frameImageBytes) {
    const baseKey = `frames/${filmId}`;
    const variants = await resizeFilmFrame(Buffer.from(input.frameImageBytes));
    await Promise.all(variants.map((variant) => uploadFilmFrame(baseKey, variant.width, variant.buffer)));
    posterKey = baseKey;
  }

  await insertFilm({
    id: filmId,
    slug,
    title: film.title,
    year: film.year,
    director: film.director,
    posterKey,
    franchiseName: film.franchiseName,
    categories: film.categories,
    cast: film.cast,
  });

  // Both routes are already dynamic, so this is belt-and-braces rather than
  // load-bearing — but it keeps the new title appearing if either is ever
  // given a cache profile.
  revalidatePath("/");
  revalidatePath(`/films/${slug}`);

  return { slug };
}
