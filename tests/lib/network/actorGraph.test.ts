import { describe, expect, it } from "vitest";
import { buildActorGraph, type CastAppearance } from "@/lib/network/actorGraph";

const twoSharedFilmsFixture: CastAppearance[] = [
  { personId: "p1", personName: "Actor One", filmId: "f1", filmTitle: "Film One" },
  { personId: "p2", personName: "Actor Two", filmId: "f1", filmTitle: "Film One" },
  { personId: "p1", personName: "Actor One", filmId: "f2", filmTitle: "Film Two" },
  { personId: "p2", personName: "Actor Two", filmId: "f2", filmTitle: "Film Two" },
];

describe("buildActorGraph", () => {
  it("creates one node per distinct person", () => {
    const graph = buildActorGraph(twoSharedFilmsFixture);
    expect(graph.nodes).toHaveLength(2);
  });

  it("collects every film a person appears in onto their node", () => {
    const graph = buildActorGraph(twoSharedFilmsFixture);
    const actorOne = graph.nodes.find((node) => node.id === "p1");
    expect(actorOne?.films).toEqual(["Film One", "Film Two"]);
  });

  it("dedupes an edge between two actors who share multiple films, counting each", () => {
    const graph = buildActorGraph(twoSharedFilmsFixture);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].sharedFilmCount).toBe(2);
  });

  it("does not create an edge between actors who never share a film", () => {
    const noOverlapFixture: CastAppearance[] = [
      { personId: "p1", personName: "Actor One", filmId: "f1", filmTitle: "Film One" },
      { personId: "p3", personName: "Actor Three", filmId: "f2", filmTitle: "Film Two" },
    ];
    const graph = buildActorGraph(noOverlapFixture);
    expect(graph.edges).toHaveLength(0);
  });

  it("increments degree for both endpoints of each edge", () => {
    const threeWayFixture: CastAppearance[] = [
      { personId: "p1", personName: "Actor One", filmId: "f1", filmTitle: "Film One" },
      { personId: "p2", personName: "Actor Two", filmId: "f1", filmTitle: "Film One" },
      { personId: "p3", personName: "Actor Three", filmId: "f1", filmTitle: "Film One" },
    ];
    const graph = buildActorGraph(threeWayFixture);
    // p1-p2, p1-p3, p2-p3 — three edges, each node touches two of them
    expect(graph.edges).toHaveLength(3);
    expect(graph.nodes.every((node) => node.degree === 2)).toBe(true);
  });

  // The reason `people` is keyed on tmdb_person_id rather than name: two actors
  // who share a name must stay two nodes, or the diagram claims a collaboration
  // between strangers.
  it("keeps two same-named people as separate nodes", () => {
    const sameNameFixture: CastAppearance[] = [
      { personId: "p1", personName: "Chris Evans", filmId: "f1", filmTitle: "Film One" },
      { personId: "p2", personName: "Chris Evans", filmId: "f2", filmTitle: "Film Two" },
    ];
    const graph = buildActorGraph(sameNameFixture);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(0);
  });

  // A one-credit film still puts its actor on the canvas, unconnected — the
  // design draws every actor in the index, not only the collaborating ones.
  it("includes an actor with no co-stars as an isolated node", () => {
    const soloFixture: CastAppearance[] = [
      { personId: "p1", personName: "Alex Honnold", filmId: "f1", filmTitle: "Free Solo" },
    ];
    const graph = buildActorGraph(soloFixture);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].degree).toBe(0);
    expect(graph.edges).toHaveLength(0);
  });
});
