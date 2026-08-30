"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import type { TmdbSearchResult } from "@/lib/tmdb/client";

// Matches the prototype's runSearch debounce in My Film Index.dc.html.
const DEBOUNCE_DELAY_MS = 180;
const MIN_QUERY_LENGTH = 2;

interface SearchResponse {
  results: TmdbSearchResult[];
  error?: string;
}

async function fetchSearchResults(url: string): Promise<SearchResponse> {
  const response = await fetch(url);
  return response.json();
}

export interface TitleSearch {
  results: TmdbSearchResult[];
  isSearching: boolean;
  // Distinguishes "nothing typed yet" from "TMDB answered, and found nothing",
  // which the modal needs to decide whether to offer the manual-entry hint.
  hasSearched: boolean;
  // The route answers a TMDB failure with 200-shaped JSON carrying `error`, so
  // an outage does not masquerade as an empty result list.
  error: string | null;
}

export function useTitleSearch(query: string): TitleSearch {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const shouldSearch = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const { data, isLoading } = useSWR<SearchResponse>(
    shouldSearch ? `/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetchSearchResults
  );

  // The prototype flips its "…" indicator on at the keystroke, not when the
  // request leaves. Waiting for isLoading alone would blink it off for the
  // 180ms debounce between every keystroke and its request.
  const isDebouncing = query !== debouncedQuery && query.trim().length >= MIN_QUERY_LENGTH;

  const isSearching = isDebouncing || (shouldSearch && isLoading);

  return {
    results: data?.results ?? [],
    isSearching,
    hasSearched: shouldSearch && data !== undefined && !isSearching,
    error: data?.error ?? null,
  };
}
