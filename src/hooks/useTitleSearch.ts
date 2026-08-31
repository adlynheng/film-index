"use client";

import useSWR from "swr";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { TmdbSearchResult } from "@/lib/tmdb/client";

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
  const debouncedQuery = useDebouncedValue(query);

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
