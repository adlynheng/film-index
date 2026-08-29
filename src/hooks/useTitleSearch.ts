"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import type { TmdbSearchResult } from "@/lib/tmdb/client";

// Matches the prototype's runSearch debounce in My Film Index.dc.html.
const DEBOUNCE_DELAY_MS = 180;
const MIN_QUERY_LENGTH = 2;

async function fetchSearchResults(url: string): Promise<{ results: TmdbSearchResult[] }> {
  const response = await fetch(url);
  return response.json();
}

export function useTitleSearch(query: string): { results: TmdbSearchResult[]; isSearching: boolean } {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const shouldSearch = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const { data, isLoading } = useSWR(
    shouldSearch ? `/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetchSearchResults
  );

  // The prototype flips its "…" indicator on at the keystroke, not when the
  // request leaves. Waiting for isLoading alone would blink it off for the
  // 180ms debounce between every keystroke and its request.
  const isDebouncing = query !== debouncedQuery && query.trim().length >= MIN_QUERY_LENGTH;

  return {
    results: data?.results ?? [],
    isSearching: isDebouncing || (shouldSearch && isLoading),
  };
}
