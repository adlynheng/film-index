"use client";
// The virtualizer re-renders by mutating a stable instance, which the React
// Compiler cannot observe: it sees `virtualizer` and `rows` unchanged and
// memoises the row list, so the grid freezes on its first window and never
// mounts the rows below the fold. This is the compiler's documented opt-out.
"use no memo";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FilmCard } from "@/components/film-index/FilmCard";
import type { FilmSummary } from "@/lib/types";

// Grid metrics from My Film Index.dc.html: gap "76px 40px",
// grid-template-columns repeat(auto-fill, minmax(340px, 1fr)).
const MIN_CARD_WIDTH = 340;
const COLUMN_GAP = 40;
const ROW_GAP = 76;

// Width and viewport assumed for the first render, before anything has been
// measured. Without these the server renders an empty grid and the index only
// appears after hydration, costing the public page its server-rendered content.
const ASSUMED_INITIAL_WIDTH = 1280;
const ASSUMED_INITIAL_VIEWPORT_HEIGHT = 900;

function measureColumnsPerRow(availableWidth: number): number {
  return Math.max(1, Math.floor((availableWidth + COLUMN_GAP) / (MIN_CARD_WIDTH + COLUMN_GAP)));
}

// Only a starting guess: every row reports its true height through
// measureElement once mounted, so titles that wrap to two or three lines
// correct themselves instead of overlapping the row beneath.
function estimateRowHeight(columnWidth: number): number {
  const imageHeight = columnWidth * (9 / 16);
  const titleAndYearBlock = 90;
  return imageHeight + titleAndYearBlock;
}

interface FilmGridProps {
  films: FilmSummary[];
  imageUrlByFilmId: Map<string, string | null>;
}

export function FilmGrid({ films, imageUrlByFilmId }: FilmGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(ASSUMED_INITIAL_WIDTH);
  const [scrollMargin, setScrollMargin] = useState(0);

  // The column count is width-derived, and a window virtualizer needs to know
  // how far down the document this grid starts (scrollMargin) so its row
  // offsets line up with the page's own scroll position.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const remeasure = () => {
      setAvailableWidth(container.clientWidth);
      setScrollMargin(container.getBoundingClientRect().top + window.scrollY);
    };
    remeasure();

    const observer = new ResizeObserver(remeasure);
    observer.observe(container);
    window.addEventListener("resize", remeasure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", remeasure);
    };
  }, [films.length]);

  const columnsPerRow = measureColumnsPerRow(availableWidth);
  const columnWidth = (availableWidth - COLUMN_GAP * (columnsPerRow - 1)) / columnsPerRow;

  const rows = useMemo(() => {
    const grouped: FilmSummary[][] = [];
    for (let index = 0; index < films.length; index += columnsPerRow) {
      grouped.push(films.slice(index, index + columnsPerRow));
    }
    return grouped;
  }, [films, columnsPerRow]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => estimateRowHeight(columnWidth),
    overscan: 2,
    gap: ROW_GAP,
    scrollMargin,
    initialRect: { width: ASSUMED_INITIAL_WIDTH, height: ASSUMED_INITIAL_VIEWPORT_HEIGHT },
  });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={virtualizer.measureElement}
          className="absolute left-0 top-0 flex w-full"
          style={{
            gap: `${COLUMN_GAP}px`,
            transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {rows[virtualRow.index].map((film) => (
            // A fixed basis rather than flex-1: the design's grid keeps its
            // empty tracks, so a short final row (or a two-film franchise) must
            // leave a gap instead of stretching its cards across the full width.
            <div
              key={film.id}
              className="min-w-0 flex-none"
              style={{ width: `calc((100% - ${COLUMN_GAP * (columnsPerRow - 1)}px) / ${columnsPerRow})` }}
            >
              <FilmCard film={film} imageUrl={imageUrlByFilmId.get(film.id) ?? null} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
