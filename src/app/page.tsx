import { cookies } from "next/headers";
import { IndexPageClient } from "@/components/film-index/IndexPageClient";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { listFilms } from "@/lib/db/films";
import { listFranchisesWithFilms } from "@/lib/db/franchises";

export default async function FilmIndexPage() {
  // Reading the cookie is what opts this route into dynamic rendering, so the
  // film list is now queried per request rather than baked in at build time.
  const cookieStore = await cookies();
  const isOwner = isOwnerRequest(cookieStore.get(OWNER_COOKIE_NAME)?.value);

  const [films, franchises] = await Promise.all([listFilms(), listFranchisesWithFilms()]);

  return <IndexPageClient films={films} franchises={franchises} isOwner={isOwner} />;
}
