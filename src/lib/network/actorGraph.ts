/**
 * Deliberately free of any database import. `buildActorGraph` is pure and is
 * unit-tested on fixtures, but `@/lib/db/client` throws at import time when
 * DATABASE_URL is unset — so keeping the query in `@/lib/db/graph` is what
 * lets the graph logic be tested without a live database. Same split as
 * saveFilmInput.ts against the Server Action, and frameWidths.ts against sharp.
 */
/** One person's credit on one film — a row of `film_cast` joined out to names. */
export interface CastAppearance {
  personId: string;
  personName: string;
  filmId: string;
  filmTitle: string;
}

export interface ActorNode {
  id: string;
  name: string;
  films: string[];
  degree: number;
}

export interface ActorEdge {
  sourceId: string;
  targetId: string;
  sharedFilmCount: number;
}

export interface ActorGraph {
  nodes: ActorNode[];
  edges: ActorEdge[];
}

/**
 * Ported from `buildGraph()` in Actor Network.dc.html, keyed on database ids
 * rather than the prototype's name strings — `people` rows are identified by
 * their TMDB person id, so two actors who share a name are two nodes here.
 *
 * The co-appearance relationship is not stored anywhere: it is derived, and
 * this is where. Two actors are linked when they appear in the same film, so
 * every film contributes a clique over its own cast.
 */
export function buildActorGraph(castRows: CastAppearance[]): ActorGraph {
  const nodeById = new Map<string, ActorNode>();
  const castRowsByFilmId = new Map<string, CastAppearance[]>();

  for (const row of castRows) {
    const existingNode = nodeById.get(row.personId);
    if (existingNode) {
      existingNode.films.push(row.filmTitle);
    } else {
      nodeById.set(row.personId, { id: row.personId, name: row.personName, films: [row.filmTitle], degree: 0 });
    }

    const castForFilm = castRowsByFilmId.get(row.filmId) ?? [];
    castForFilm.push(row);
    castRowsByFilmId.set(row.filmId, castForFilm);
  }

  const edgeByPersonPairKey = new Map<string, ActorEdge>();
  for (const castForOneFilm of castRowsByFilmId.values()) {
    for (let i = 0; i < castForOneFilm.length; i++) {
      for (let j = i + 1; j < castForOneFilm.length; j++) {
        // Sorted so the pair is order-independent: A-then-B and B-then-A in two
        // different films have to land on the same edge to be counted as one.
        const [sourceId, targetId] = [castForOneFilm[i].personId, castForOneFilm[j].personId].sort();
        const pairKey = `${sourceId}::${targetId}`;
        const existingEdge = edgeByPersonPairKey.get(pairKey);
        if (existingEdge) {
          existingEdge.sharedFilmCount += 1;
        } else {
          edgeByPersonPairKey.set(pairKey, { sourceId, targetId, sharedFilmCount: 1 });
        }
      }
    }
  }

  // Degree counts distinct collaborators, not shared films: two people who made
  // three films together are one edge and one degree each.
  for (const edge of edgeByPersonPairKey.values()) {
    nodeById.get(edge.sourceId)!.degree += 1;
    nodeById.get(edge.targetId)!.degree += 1;
  }

  return { nodes: Array.from(nodeById.values()), edges: Array.from(edgeByPersonPairKey.values()) };
}
