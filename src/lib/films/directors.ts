/**
 * A film can have more than one director — the Coens, the Russos, a
 * documentary's co-directors — and `films.director` stays a single text
 * column: the names are stored comma-separated and read back joined by a
 * middle dot. Both forms live here so nothing else has to know either.
 */

// What the reader sees. Not a comma: the names are a set, not a sentence.
export const DIRECTOR_SEPARATOR = " · ";

/** The names in a stored value, in order, with the blanks a stray comma leaves dropped. */
export function parseDirectors(stored: string | null | undefined): string[] {
  return String(stored ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/**
 * The canonical stored form, from whatever was typed: "  Joel Coen ,, Ethan
 * Coen " becomes "Joel Coen, Ethan Coen". Null where no name survives, which
 * is what the column holds for an unlogged director.
 */
export function normalizeDirectors(input: string | null | undefined): string | null {
  const names = parseDirectors(input);
  return names.length > 0 ? names.join(", ") : null;
}

/** How directors read anywhere in the app. Empty where there are none. */
export function formatDirectors(stored: string | null | undefined): string {
  return parseDirectors(stored).join(DIRECTOR_SEPARATOR);
}
