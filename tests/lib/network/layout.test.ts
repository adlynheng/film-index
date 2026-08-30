import { describe, expect, it } from "vitest";
import type { ActorGraph } from "@/lib/network/actorGraph";
import { layoutActorGraph, nodeRadius } from "@/lib/network/layout";

const graph: ActorGraph = {
  nodes: [
    { id: "p1", name: "Actor One", films: ["Film One"], degree: 2 },
    { id: "p2", name: "Actor Two", films: ["Film One"], degree: 2 },
    { id: "p3", name: "Actor Three", films: ["Film One"], degree: 2 },
    { id: "p4", name: "Loner", films: ["Film Two"], degree: 0 },
  ],
  edges: [
    { sourceId: "p1", targetId: "p2", sharedFilmCount: 1 },
    { sourceId: "p1", targetId: "p3", sharedFilmCount: 1 },
    { sourceId: "p2", targetId: "p3", sharedFilmCount: 1 },
  ],
};

describe("layoutActorGraph", () => {
  it("gives every node finite coordinates, including one with no edges", () => {
    const laid = layoutActorGraph(graph);
    expect(laid.nodes).toHaveLength(4);
    for (const node of laid.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("carries the graph's own fields through untouched", () => {
    const laid = layoutActorGraph(graph);
    const first = laid.nodes.find((node) => node.id === "p1");
    expect(first).toMatchObject({ name: "Actor One", films: ["Film One"], degree: 2 });
    expect(laid.edges).toEqual(graph.edges);
  });

  it("separates connected nodes rather than stacking them at one point", () => {
    const laid = layoutActorGraph(graph);
    const [a, b] = [laid.nodes[0], laid.nodes[1]];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(10);
  });

  it("reports bounds that contain every node", () => {
    const { nodes, bounds } = layoutActorGraph(graph);
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(node.x).toBeLessThanOrEqual(bounds.maxX);
      expect(node.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(node.y).toBeLessThanOrEqual(bounds.maxY);
    }
  });

  // The radius is what makes hubs read as hubs, and it is clamped so one very
  // well-connected actor cannot swamp the canvas.
  it("grows node radius with degree, up to a cap", () => {
    expect(nodeRadius(0)).toBe(4.5);
    expect(nodeRadius(5)).toBeGreaterThan(nodeRadius(2));
    expect(nodeRadius(100)).toBe(13.5);
  });

  // Same graph in, same picture out — a layout that drifted between renders
  // would move every node on an unrelated state change.
  it("is reproducible for the same input", () => {
    expect(layoutActorGraph(graph).nodes.map((n) => [n.x, n.y])).toEqual(
      layoutActorGraph(graph).nodes.map((n) => [n.x, n.y])
    );
  });
});
