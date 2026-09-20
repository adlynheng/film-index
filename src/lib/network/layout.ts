import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { Force, SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { ActorEdge, ActorGraph, ActorNode } from "@/lib/network/actorGraph";

/** The virtual canvas the graph is laid out on, before the view transform frames it. */
export const LAYOUT_WIDTH = 1400;
export const LAYOUT_HEIGHT = 900;

// 400 settled the graph alone, but the label force below relieves crowding by
// rearranging nodes rather than pushing the whole layout outwards, and that
// takes longer to converge. 150 nodes make the extra ticks cheap.
const SIMULATION_TICKS = 900;

// A node's radius grows with its degree, so the busiest actors read as the hubs
// they are — the prototype's idea, at about three quarters of its size. The
// dots were drawn for a sparser graph than this one became; smaller ones leave
// the clusters' shapes legible now that they are packed tightly together.
// Spans 3.4 to 10, where the prototype's spanned 4.5 to 13.5.
export function nodeRadius(degree: number): number {
  return 3.4 + Math.min(6.6, degree * 0.5);
}

export interface NodePosition {
  x: number;
  y: number;
}

interface SimulationActor extends SimulationNodeDatum {
  id: string;
  radius: number;
  /** The label's width in layout units — see `estimateLabelWidth`. */
  labelWidth: number;
}

// The canvas draws each label to the right of its node at `radius + 7`, then
// sets the font in *screen* px, which clamps to a 9.35px floor once the fitted
// scale falls below 0.85 — as this graph's does. A label therefore does not
// shrink when the graph does, and its footprint in layout units is its screen
// size divided by the fitted scale.
//
// LABEL_FONT_PX is ActorNetworkCanvas's font expression at its lower clamp and
// has to be changed whenever that expression is. FITTED_SCALE is deliberately
// not the scale a 1440x900 viewport settles on, which is 0.71, but the low end
// of the range the page renders across — a 1280-wide window fits at about
// 0.61. Assuming the smaller scale over-states every label's footprint by a
// sixth at the roomier viewport, and that margin is what keeps the narrow one
// clear as well; assuming the larger scale leaves 1280x800 overlapping.
const FITTED_SCALE = 0.61;
const LABEL_FONT_PX = 9.35;
const LABEL_GAP = 7;
const LABEL_LINE_HEIGHT = 1.2;
// Breathing room, in layout units, so labels end up separated rather than
// merely not touching — and so the width estimate below can run a little short
// without letting a pair touch.
const LABEL_PADDING = 2.4;
const LABEL_EM = LABEL_FONT_PX / FITTED_SCALE;
const LABEL_BOX_HEIGHT = (LABEL_FONT_PX * LABEL_LINE_HEIGHT) / FITTED_SCALE + LABEL_PADDING;

// There is no canvas on the server to measure text with, so glyphs are priced
// by class. Advances are in ems, checked against the browser's own
// measureText over all 148 rendered labels: 2.4% mean error, never more than
// 7% short, which LABEL_PADDING covers.
const NARROW_GLYPHS = new Set("ijlrtfI.,;:'!|()[]-  ");
const WIDE_GLYPHS = new Set("mwMW@%");

function estimateLabelWidth(name: string): number {
  let ems = 0;
  for (const glyph of name) {
    ems += NARROW_GLYPHS.has(glyph) ? 0.3 : WIDE_GLYPHS.has(glyph) ? 0.85 : 0.56;
  }
  return ems * LABEL_EM;
}

/**
 * Keeps the *labels* apart, which `forceCollide` above cannot: it knows only
 * the dots, and two dots a comfortable distance apart still produce two long
 * horizontal bars of text that sit on top of each other. This gives each label
 * its real footprint and pushes overlapping pairs apart vertically.
 *
 * This only works together with the centring strengths below. The view
 * auto-fits, so the layout's absolute size never reaches the screen — push
 * every crowded pair apart and the graph just grows, the fit zooms out by the
 * same proportion, and the picture is identical. Containing the envelope is
 * what forces the relief to come from rearrangement into the empty space
 * instead, which is the part that actually clears the labels.
 *
 * Velocities are nudged rather than positions set, exactly as d3's own collide
 * does, so this negotiates with the link and charge forces instead of
 * overriding them and tearing clusters apart.
 */
function forceLabelSeparation(strength: number): Force<SimulationActor, undefined> {
  let nodes: SimulationActor[] = [];

  function force(): void {
    // Sweep and prune down the y axis. A label box is short but very wide, so
    // sorting by y lets each node stop comparing the moment the vertical gap
    // exceeds one box height — a handful of neighbours rather than all 298.
    const ordered = nodes.slice().sort((a, b) => (a.y ?? 0) - (b.y ?? 0));

    for (let i = 0; i < ordered.length; i += 1) {
      const a = ordered[i]!;
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = ordered[j]!;
        const gapY = (b.y ?? 0) - (a.y ?? 0);
        if (gapY >= LABEL_BOX_HEIGHT) break;

        const aLeft = (a.x ?? 0) + a.radius + LABEL_GAP;
        const bLeft = (b.x ?? 0) + b.radius + LABEL_GAP;
        const aRight = aLeft + a.labelWidth + LABEL_PADDING;
        const bRight = bLeft + b.labelWidth + LABEL_PADDING;
        if (aLeft >= bRight || bLeft >= aRight) continue;

        // Vertical only. Separating two labels horizontally means clearing a
        // box up to 150 units wide, which drags the graph apart for little
        // gain, whereas 22 units of vertical travel clears the same pair.
        const shift = ((LABEL_BOX_HEIGHT - gapY) / 2) * strength;
        a.vy = (a.vy ?? 0) - shift;
        b.vy = (b.vy ?? 0) + shift;
      }
    }
  }

  force.initialize = (simulationNodes: SimulationActor[]): void => {
    nodes = simulationNodes;
  };
  return force;
}

/**
 * Settles the graph with d3-force, whose many-body force uses a Barnes–Hut
 * quadtree — O(N log N) per tick rather than the O(N²) of the prototype's
 * hand-rolled loop, which is what keeps this usable as the index grows.
 *
 * Every strength here was swept against this index's real topology, which is
 * 16 disconnected components — one per film, give or take the few actors who
 * bridge two — so "cluster" has a ground truth to tune against rather than an
 * impression. With weak centring the components drift apart until the fit
 * shrinks everything to an unreadable 0.45 scale. The collision force is an
 * addition the prototype had none of, and it is what stops the dense clusters
 * overlapping into a blob.
 *
 * The link settings are what define the clusters. d3 defaults link strength to
 * 1 / min(degree of each end), which for an eight-strong film clique is about
 * 0.14 — slack enough that the charge pulls the clique open until it overlaps
 * its neighbours. Pinning it to 0.8 over a short distance holds each film
 * together as a body, and the charge then separates those bodies instead of
 * inflating them. Scored as the silhouette of the components over four node
 * orderings: 0.17 at the old 96/auto/-220, 0.49 here, with the nearest
 * node of another cluster going from 0.65x a node's own clustermates to
 * 1.37x — from interpenetrating to plainly apart. Weighting link strength by
 * `sharedFilmCount` was tried here and measured slightly worse (0.48), so the
 * strength stays flat.
 *
 * The separation is paid for in zoom: the fitted scale falls from 0.77 to
 * 0.71, since more sharply separated clusters need more room.
 *
 * Measured in the browser at a 1440x900 viewport: 82 overlapping label pairs
 * with centring at 0.1 and no label force, 17 with 0.16 and the force — and
 * those 17 are line-box grazes of at most 2px, which fall inside the leading,
 * so no two glyphs touch at all. The fitted scale rises from 0.65 to 0.77 as
 * well, leaving the graph larger on screen than it was.
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
    labelWidth: estimateLabelWidth(node.name),
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
        .distance(45)
        .strength(0.8)
    )
    .force("charge", forceManyBody().strength(-300))
    .force("collide", forceCollide<SimulationActor>().radius((node) => node.radius + 9))
    .force("labels", forceLabelSeparation(0.4))
    // 0.16 rather than the 0.1 this first shipped with — see the label force.
    .force("centreX", forceX(LAYOUT_WIDTH / 2).strength(0.16))
    .force("centreY", forceY(LAYOUT_HEIGHT / 2).strength(0.16))
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
