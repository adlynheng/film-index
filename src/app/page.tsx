import { cookies } from "next/headers";
import { IndexPageClient } from "@/components/film-index/IndexPageClient";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { listFilms } from "@/lib/db/films";
import { listGroupsWithFilms } from "@/lib/db/groups";

export default async function FilmIndexPage() {
  // Reading the cookie is what opts this route into dynamic rendering, so the
  // film list is now queried per request rather than baked in at build time.
  const cookieStore = await cookies();
  const isOwner = isOwnerRequest(cookieStore.get(OWNER_COOKIE_NAME)?.value);

  // The groups are sliced from this same list rather than re-queried, so the
  // page costs one films query however many grouped views there are.
  const films = await listFilms();
  const [franchises, studios] = await Promise.all([
    listGroupsWithFilms("franchise", films),
    listGroupsWithFilms("studio", films),
  ]);

  return <IndexPageClient films={films} franchises={franchises} studios={studios} isOwner={isOwner} />;
}
