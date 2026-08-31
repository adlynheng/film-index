"use client";

import { useEffect, useState } from "react";

// Matches the prototype's runSearch debounce in My Film Index.dc.html, and is
// the default for every lookup field in the add-title dialog so they all feel
// the same under the fingers.
export const DEFAULT_DEBOUNCE_MS = 180;

/**
 * Returns `value` as it was `delayMs` ago, restarting the clock on every
 * change — so a field that fires a request per keystroke instead fires one per
 * pause. Shared by the TMDB title search and the cast-name lookup.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
