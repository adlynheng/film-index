"use client";
// The virtualizer re-renders by mutating a stable instance, which the React
// Compiler cannot observe: it sees `virtualizer` and `rows` unchanged and
// memoises the row list, so the grid freezes on its first window and never
// mounts the rows below the fold. This is the compiler's documented opt-out.
"use no memo";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FilmCard } from "@/components/film-index/FilmCard";
import type { FilmImage } from "@/lib/images/r2";
import type { FilmSummary } from "@/lib/types";

// Column gap from My Film Index.dc.html ("76px 40px"). The tracks themselves
// are now Tailwind's `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; this
// constant only survives
// because the row heights still have to be estimated in JS.
const COLUMN_GAP = 40;
const ROW_GAP = 76;

// Chunking rows for the virtualizer needs the column count in JavaScript, and
// it has to agree with what CSS actually renders — so it is read from the same
// breakpoints Tailwind's `sm:` and `lg:` compile to rather than measured
// independently.
const SM_BREAKPOINT = "(min-width: 640px)";
const LG_BREAKPOINT = "(min-width: 1024px)";
const COLUMNS_AT_LG = 3;
const COLUMNS_AT_SM = 2;
const COLUMNS_BELOW_SM = 1;

// Width and viewport assumed for the first render, before anything has been
// measured. Without these the server renders an empty grid and the index only
// appears after hydration, costing the public page its server-rendered content.
const ASSUMED_INITIAL_WIDTH = 1280;
const ASSUMED_INITIAL_VIEWPORT_HEIGHT = 900;

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
  imageByFilmId: Map<string, FilmImage | null>;
}

export function FilmGrid({ films, imageByFilmId }: FilmGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(ASSUMED_INITIAL_WIDTH);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Server-rendered as the desktop grid, matching ASSUMED_INITIAL_WIDTH; the
  // media query corrects it after mount, so narrow viewports reflow once
  // rather than hydrating against a different row shape.
  const [columnsPerRow, setColumnsPerRow] = useState(COLUMNS_AT_LG);

  // A window virtualizer needs to know how far down the document this grid
  // starts (scrollMargin) so its row offsets line up with the page's own
  // scroll position, and the row-height estimate needs the column width.
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

  useEffect(() => {
    const atLg = window.matchMedia(LG_BREAKPOINT);
    const atSm = window.matchMedia(SM_BREAKPOINT);
    const sync = () =>
      setColumnsPerRow(atLg.matches ? COLUMNS_AT_LG : atSm.matches ? COLUMNS_AT_SM : COLUMNS_BELOW_SM);
    sync();
    atLg.addEventListener("change", sync);
    atSm.addEventListener("change", sync);
    return () => {
      atLg.removeEventListener("change", sync);
      atSm.removeEventListener("change", sync);
    };
  }, []);

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
        // Fixed tracks rather than auto-fit: a short final row (or a two-film
        // franchise) leaves its empty tracks standing instead of stretching its
        // cards across the full width, as the design does.
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={virtualizer.measureElement}
          className="absolute left-0 top-0 grid w-full grid-cols-1 gap-x-[40px] sm:grid-cols-2 lg:grid-cols-3"
          style={{ transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)` }}
        >
          {rows[virtualRow.index].map((film) => (
            <div key={film.id} className="min-w-0">
              <FilmCard film={film} image={imageByFilmId.get(film.id) ?? null} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
