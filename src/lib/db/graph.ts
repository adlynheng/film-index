import { sql } from "@/lib/db/client";
import { buildActorGraph, type ActorGraph, type CastAppearance } from "@/lib/network/actorGraph";

// Re-exported so callers can take the graph and its types from one import.
export { buildActorGraph } from "@/lib/network/actorGraph";
export type { ActorEdge, ActorGraph, ActorNode, CastAppearance } from "@/lib/network/actorGraph";

export async function fetchActorGraph(): Promise<ActorGraph> {
  // Aliases are double-quoted so Postgres preserves their case and the rows
  // arrive as CastAppearance without a mapping step.
  //
  // Ordered by release year so each node's `films` list reads chronologically
  // in the hover card; grouping into films is done by the Map above, not by
  // the row order, so this ordering is free to serve the display.
  const castRows = await sql<CastAppearance[]>`
    select
      fc.person_id as "personId",
      p.name       as "personName",
      fc.film_id   as "filmId",
      f.title      as "filmTitle"
    from film_cast fc
    join people p on p.id = fc.person_id
    join films f on f.id = fc.film_id
    order by f.year nulls last, f.title, fc.sort_order
  `;
  return buildActorGraph(castRows);
}
