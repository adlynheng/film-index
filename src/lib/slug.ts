export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    // Drop the combining diacritical marks NFKD just split off. Without this,
    // "Alfonso Cuarón" slugifies to "alfonso-cuaro-n" — the mark falls through
    // to the punctuation rule below and becomes a hyphen.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFilmSlug(title: string, year: number | null): string {
  const titleSlug = slugify(title);
  return year ? `${titleSlug}-${year}` : titleSlug;
}

export async function generateUniqueFilmSlug(
  title: string,
  year: number | null,
  slugExists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = buildFilmSlug(title, year);
  if (!(await slugExists(baseSlug))) {
    return baseSlug;
  }
  let suffix = 2;
  while (await slugExists(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseSlug}-${suffix}`;
}
