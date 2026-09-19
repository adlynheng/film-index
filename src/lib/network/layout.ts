import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { ActorEdge, ActorGraph, ActorNode } from "@/lib/network/actorGraph";

/** The virtual canvas the graph is laid out on, before the view transform frames it. */
export const LAYOUT_WIDTH = 1400;
export const LAYOUT_HEIGHT = 900;

const SIMULATION_TICKS = 400;

// Carried over from Actor Network.dc.html: a node's radius grows with its
// degree, so the busiest actors read as the hubs they are.
export function nodeRadius(degree: number): number {
  return 4.5 + Math.min(9, degree * 0.7);
}

export interface NodePosition {
  x: number;
  y: number;
}

interface SimulationActor extends SimulationNodeDatum {
  id: string;
  radius: number;
}

/**
 * Settles the graph with d3-force, whose many-body force uses a Barnes–Hut
 * quadtree — O(N log N) per tick rather than the O(N²) of the prototype's
 * hand-rolled loop, which is what keeps this usable as the index grows.
 *
 * The link distance is the prototype's 96 exactly. The charge and centring
 * strengths were swept against this index's real topology: the index is mostly
 * disconnected film-cliques joined by a few bridging actors, and with weak
 * centring the cliques drift apart until the fit shrinks everything to an
 * unreadable 0.45 scale. At -220/0.1 the graph settles to roughly 927x782,
 * which fills the area the panel leaves free at a natural scale of ~1. The collision force is an addition — the
 * prototype had none, and it is what stops the dense clusters overlapping
 * into an unreadable blob.
 *
 * **Server-only, and deliberately so.** d3 seeds its start positions from a
 * fixed spiral and its own PRNG, so this is reproducible within one JS engine
 * — but not across two. Running it during SSR *and* again during hydration
 * produced coordinates differing in the last few significant digits, which
 * React reports as a hydration mismatch. Computing it once on the server and
 * shipping the coordinates removes the class of bug entirely, and keeps
 * d3-force out of the client bundle.
 */
function computeLayout(nodes: ActorNode[], edges: ActorEdge[]): Map<string, NodePosition> {
  const simulationNodes: SimulationActor[] = nodes.map((node) => ({
    id: node.id,
    radius: nodeRadius(node.degree),
  }));

  const simulationLinks: SimulationLinkDatum<SimulationActor>[] = edges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
  }));

  const simulation = forceSimulation(simulationNodes)
    .force(
      "link",
      forceLink<SimulationActor, SimulationLinkDatum<SimulationActor>>(simulationLinks)
        .id((node) => node.id)
        .distance(96)
    )
    .force("charge", forceManyBody().strength(-220))
    .force("collide", forceCollide<SimulationActor>().radius((node) => node.radius + 9))
    .force("centreX", forceX(LAYOUT_WIDTH / 2).strength(0.1))
    .force("centreY", forceY(LAYOUT_HEIGHT / 2).strength(0.1))
    .stop();

  // Ticked to completion rather than left running: the design shows a settled
  // graph, and a static layout means no animation frame budget on a page whose
  // interactions are pan, zoom, and hover.
  simulation.tick(SIMULATION_TICKS);

  const positionById = new Map<string, NodePosition>();
  for (const node of simulationNodes) {
    positionById.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }
  return positionById;
}

export interface PositionedActorNode extends ActorNode, NodePosition {}

export interface PositionedActorGraph {
  nodes: PositionedActorNode[];
  edges: ActorEdge[];
  bounds: Bounds;
}

/**
 * The server-side entry point: takes the graph as queried and returns it with
 * every node's coordinates resolved, ready for the client to render as-is.
 */
export function layoutActorGraph(graph: ActorGraph): PositionedActorGraph {
  const positionById = computeLayout(graph.nodes, graph.edges);
  const nodes = graph.nodes.map((node) => {
    const position = positionById.get(node.id) ?? { x: 0, y: 0 };
    return { ...node, x: position.x, y: position.y };
  });
  return { nodes, edges: graph.edges, bounds: layoutBounds(positionById) };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function layoutBounds(positions: Map<string, NodePosition>): Bounds {
  const points = Array.from(positions.values());
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: LAYOUT_WIDTH, maxY: LAYOUT_HEIGHT };
  }
  return {
    // Padded asymmetrically on the right, as the prototype's fit() does, to
    // leave room for the labels that sit to the right of each node.
    minX: Math.min(...points.map((p) => p.x)) - 30,
    maxX: Math.max(...points.map((p) => p.x)) + 150,
    minY: Math.min(...points.map((p) => p.y)) - 20,
    maxY: Math.max(...points.map((p) => p.y)) + 20,
  };
}
