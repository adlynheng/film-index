import { IndexPageClient } from "@/components/film-index/IndexPageClient";
import { listFilms } from "@/lib/db/films";
import { listFranchisesWithFilms } from "@/lib/db/franchises";

export default async function FilmIndexPage() {
  const [films, franchises] = await Promise.all([listFilms(), listFranchisesWithFilms()]);

  return <IndexPageClient films={films} franchises={franchises} />;
}
