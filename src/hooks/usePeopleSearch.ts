"use client";

import useSWR from "swr";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { PersonSuggestion } from "@/lib/db/people";

const MIN_QUERY_LENGTH = 2;

interface PeopleSearchResponse {
  results: PersonSuggestion[];
  error?: string;
}

async function fetchPeople(url: string): Promise<PeopleSearchResponse> {
  const response = await fetch(url);
  return response.json();
}

/**
 * Suggests people already in the index for one cast field. Every row mounts
 * its own copy, which costs nothing extra: SWR keys on the URL, so two rows
 * typing the same name share a single request.
 */
export function usePeopleSearch(query: string): { suggestions: PersonSuggestion[]; isSearching: boolean } {
  const debouncedQuery = useDebouncedValue(query);
  const shouldSearch = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const { data, isLoading } = useSWR<PeopleSearchResponse>(
    shouldSearch ? `/api/people/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetchPeople
  );

  const isDebouncing = query !== debouncedQuery && query.trim().length >= MIN_QUERY_LENGTH;

  return {
    suggestions: data?.results ?? [],
    isSearching: isDebouncing || (shouldSearch && isLoading),
  };
}
