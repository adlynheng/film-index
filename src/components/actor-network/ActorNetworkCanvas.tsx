"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { ActorHoverPanel } from "@/components/actor-network/ActorHoverPanel";
import { ActorSearchField } from "@/components/actor-network/ActorSearchField";
import { ZoomControls } from "@/components/actor-network/ZoomControls";
import { nodeRadius, type PositionedActorGraph } from "@/lib/network/layout";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.5;
const BUTTON_ZOOM_STEP = 1.25;

// Below this scale only the hubs keep their labels, or the canvas becomes a
// wall of overlapping names. Both thresholds come from the design.
const LABEL_SCALE_THRESHOLD = 0.62;
const LABEL_DEGREE_THRESHOLD = 6;

interface ActorNetworkCanvasProps {
  // Already laid out: coordinates are resolved on the server, so this
  // component only ever renders them. See the note in layout.ts.
  graph: PositionedActorGraph;
}

export function ActorNetworkCanvas({ graph }: ActorNetworkCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Once the reader pans or zooms, refitting on resize would yank the view out
  // from under them, so the automatic fit only applies until they take over.
  const userHasMovedViewRef = useRef(false);

  const [view, setView] = useState<ZoomTransform>(zoomIdentity);
  const [query, setQuery] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const bounds = graph.bounds;
  const positionById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
    [graph.nodes]
  );

  const neighborsByNodeId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of graph.nodes) map.set(node.id, new Set());
    for (const edge of graph.edges) {
      map.get(edge.sourceId)?.add(edge.targetId);
      map.get(edge.targetId)?.add(edge.sourceId);
    }
    return map;
  }, [graph]);

  /** Frames the whole graph in the space the left-hand panel leaves free. */
  const computeFitTransform = useCallback((): ZoomTransform => {
    const svg = svgRef.current;
    const viewportWidth = svg?.clientWidth || window.innerWidth;
    const viewportHeight = svg?.clientHeight || window.innerHeight;
    const panelRect = panelRef.current?.getBoundingClientRect();
    const svgLeft = svg?.getBoundingClientRect().left ?? 0;

    const isWideViewport = viewportWidth > 900;
    const leftInset = isWideViewport && panelRect ? panelRect.right - svgLeft + 44 : 30;
    const topInset = isWideViewport ? 50 : (panelRect?.height ?? 340) + 60;
    const bottomInset = Math.min(100, viewportHeight * 0.14);
    const rightInset = Math.min(180, viewportWidth * 0.1);

    const availableWidth = Math.max(200, viewportWidth - leftInset - rightInset);
    const availableHeight = Math.max(200, viewportHeight - topInset - bottomInset);
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    const scale = Math.max(0.3, Math.min(1.15, Math.min(availableWidth / graphWidth, availableHeight / graphHeight)));
    return zoomIdentity
      .translate(
        leftInset + (availableWidth - graphWidth * scale) / 2 - bounds.minX * scale,
        topInset + (availableHeight - graphHeight * scale) / 2 - bounds.minY * scale
      )
      .scale(scale);
  }, [bounds]);

  // d3-zoom owns the gesture and remains the single source of truth for the
  // transform; React state only mirrors it so the SVG and the HTML label layer
  // can render from the same numbers. Every programmatic change goes back
  // through behavior.transform, so the two never diverge.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        // sourceEvent is null for programmatic transforms (the fit and reset),
        // which is what keeps those from counting as the reader taking over.
        if (event.sourceEvent) userHasMovedViewRef.current = true;
        setView(event.transform);
      });

    zoomBehaviorRef.current = behavior;
    select(svg).call(behavior);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const applyFit = () => {
      const behavior = zoomBehaviorRef.current;
      if (!behavior || userHasMovedViewRef.current) return;
      select(svg).call(behavior.transform, computeFitTransform());
    };

    applyFit();
    const observer = new ResizeObserver(() => requestAnimationFrame(applyFit));
    observer.observe(svg);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [computeFitTransform]);

  const zoomByFactor = useCallback((factor: number) => {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svg || !behavior) return;
    userHasMovedViewRef.current = true;
    behavior.scaleBy(select(svg), factor);
  }, []);

  const resetView = useCallback(() => {
    const svg = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svg || !behavior) return;
    userHasMovedViewRef.current = false;
    setQuery("");
    behavior.transform(select(svg), computeFitTransform());
  }, [computeFitTransform]);

  const trimmedQuery = query.trim().toLowerCase();
  const matchingNodeIds = useMemo(
    () =>
      trimmedQuery
        ? graph.nodes.filter((node) => node.name.toLowerCase().includes(trimmedQuery)).map((node) => node.id)
        : [],
    [graph.nodes, trimmedQuery]
  );

  // Searching down to a single actor focuses them, so the search box doubles as
  // a way to inspect someone without finding their dot first.
  const focusedNodeId = hoveredNodeId ?? (matchingNodeIds.length === 1 ? matchingNodeIds[0] : null);
  const focusedNeighborIds = focusedNodeId ? neighborsByNodeId.get(focusedNodeId) : undefined;
  const isDimmed = focusedNodeId !== null || matchingNodeIds.length > 0;

  // Set rather than the array above: this is consulted once per node and once
  // per label on every render.
  const matchedNodeIds = useMemo(() => new Set(matchingNodeIds), [matchingNodeIds]);

  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>(matchingNodeIds);
    if (focusedNodeId) {
      ids.add(focusedNodeId);
      for (const neighborId of focusedNeighborIds ?? []) ids.add(neighborId);
    }
    return ids;
  }, [matchingNodeIds, focusedNodeId, focusedNeighborIds]);

  const isNodeActive = (nodeId: string) => !isDimmed || activeNodeIds.has(nodeId);

  const focusedNode = focusedNodeId ? graph.nodes.find((node) => node.id === focusedNodeId) ?? null : null;

  const labelledNodes = graph.nodes.filter((node) => {
    if (node.id === focusedNodeId || focusedNeighborIds?.has(node.id) || matchedNodeIds.has(node.id)) return true;
    if (focusedNodeId) return false;
    return view.k >= LABEL_SCALE_THRESHOLD || node.degree >= LABEL_DEGREE_THRESHOLD;
  });

  const labelFontSize = Math.max(10, Math.min(14, 12.5 * Math.max(0.85, Math.min(1.15, view.k))));

  return (
    <main className="relative h-screen w-full overflow-hidden bg-network">
      <div
        ref={panelRef}
        className="pointer-events-none absolute left-[40px] top-[28px] z-10 flex w-[400px] max-w-[44vw] flex-col gap-[26px]"
      >
        <nav className="pointer-events-auto">
          <Link href="/" className="flex w-fit items-center gap-[9px] border-b border-ink pb-px text-sm">
            <span className="text-[15px] leading-none">←</span> My Film Index
          </Link>
        </nav>
        {/* The floating "+" button's glass, minus its border: nodes and edges
            pass under this panel, and frosting them keeps the heading legible
            without hiding the graph behind an opaque block. The negative
            margins let the card bleed past the text so it reads as a surface,
            while the text itself stays aligned with the nav link above. */}
        <div className="-mx-[18px] rounded-[4px] px-[18px] pb-[18px] pt-[14px] backdrop-blur-[16px] backdrop-saturate-[1.7]">
          <h1 className="text-[clamp(38px,5.4vw,74px)] font-medium leading-[0.9] tracking-[-0.04em]">
            Who has worked
            <br />
            with whom
          </h1>
          <p className="mt-[18px] max-w-[360px] text-pretty text-[15px] leading-[1.45] text-body">
          Every actor in the index - each link represents a film or series they have worked in together. Scroll to zoom, drag to move, search to find
            someone.
          </p>
        </div>
        <ActorSearchField
          query={query}
          onQueryChange={setQuery}
          statLabel={`${graph.nodes.length} actors · ${graph.edges.length} shared credits`}
        />
      </div>

      <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <g transform={view.toString()}>
          {graph.edges.map((edge) => {
            const source = positionById.get(edge.sourceId);
            const target = positionById.get(edge.targetId);
            if (!source || !target) return null;

            const touchesFocus = focusedNodeId === edge.sourceId || focusedNodeId === edge.targetId;
            const edgeIsActive =
              !isDimmed || touchesFocus || (activeNodeIds.has(edge.sourceId) && activeNodeIds.has(edge.targetId));
            return (
              <line
                key={`${edge.sourceId}-${edge.targetId}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={
                  edgeIsActive
                    ? touchesFocus
                      ? "var(--color-ink)"
                      : "var(--color-edgeActive)"
                    : "var(--color-edgeFaint)"
                }
                // Thicker for a repeated collaboration: three films together
                // reads as a heavier tie than one.
                strokeWidth={Math.min(3, 0.8 + edge.sharedFilmCount * 0.6)}
              />
            );
          })}

          {graph.nodes.map((node) => {
            const position = positionById.get(node.id);
            if (!position) return null;
            const radius = nodeRadius(node.degree);
            return (
              <g
                key={node.id}
                transform={`translate(${position.x.toFixed(1)},${position.y.toFixed(1)})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="cursor-pointer"
              >
                {/* Invisible, larger hit target: the dots get down to 4.5px. */}
                <circle r={Math.max(14, radius + 8)} fill="transparent" />
                <circle
                  r={radius}
                  // A search hit outranks the focus fill: with one match the
                  // node is both, and "the actor you searched for" is the more
                  // useful thing for the colour to be saying. The paler blue
                  // says "still more than one of these".
                  fill={
                    matchedNodeIds.has(node.id)
                      ? matchedNodeIds.size === 1
                        ? "var(--color-nodeMatch)"
                        : "var(--color-nodeMatchCandidate)"
                      : focusedNodeId === node.id
                        ? "var(--color-ink)"
                        : isNodeActive(node.id)
                          ? "var(--color-nodeActive)"
                          : "var(--color-nodeInactive)"
                  }
                  stroke="var(--color-network)"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Labels are HTML rather than SVG <text>, as in the design: they stay at
          a legible size regardless of zoom instead of scaling with the graph. */}
      <div className="pointer-events-none absolute inset-0 z-[5]">
        {labelledNodes.map((node) => {
          const position = positionById.get(node.id);
          if (!position) return null;
          const radius = nodeRadius(node.degree);
          return (
            <div
              key={node.id}
              className="absolute -translate-y-1/2 whitespace-nowrap tracking-[-0.01em]"
              style={{
                left: Math.round(position.x * view.k + view.x + (radius + 7) * view.k),
                top: Math.round(position.y * view.k + view.y),
                fontSize: `${labelFontSize.toFixed(1)}px`,
                fontWeight: focusedNodeId === node.id ? 500 : 400,
                color:
                  focusedNodeId === node.id
                    ? "var(--color-ink)"
                    : isNodeActive(node.id)
                      ? "var(--color-labelBody)"
                      : "var(--color-labelFaint)",
              }}
            >
              {node.name}
            </div>
          );
        })}
      </div>

      <ZoomControls
        onZoomIn={() => zoomByFactor(BUTTON_ZOOM_STEP)}
        onZoomOut={() => zoomByFactor(1 / BUTTON_ZOOM_STEP)}
        onReset={resetView}
      />

      {focusedNode ? (
        <ActorHoverPanel node={focusedNode} collaboratorCount={neighborsByNodeId.get(focusedNode.id)?.size ?? 0} />
      ) : null}
    </main>
  );
}
