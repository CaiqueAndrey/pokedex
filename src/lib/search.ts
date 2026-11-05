/** Lowercase, strip accents, and treat hyphens/dots/apostrophes as spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-_.'’:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedQuery =
  { kind: "empty" } | { kind: "number"; number: number } | { kind: "text"; text: string };

/** "25", "#025" → number search; anything else → name search. */
export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };
  const numeric = /^#?(\d{1,4})$/.exec(trimmed);
  if (numeric) return { kind: "number", number: Number(numeric[1]) };
  const text = normalizeText(trimmed);
  return text ? { kind: "text", text } : { kind: "empty" };
}

export function matchesQuery(
  pokemon: { name: string; speciesId: number },
  query: ParsedQuery,
): boolean {
  switch (query.kind) {
    case "empty":
      return true;
    case "number":
      return pokemon.speciesId === query.number;
    case "text":
      return normalizeText(pokemon.name).includes(query.text);
  }
}

/** "Mr. Mime", " #025 ", "Farfetch'd", "Nidoran ♀" → "mr-mime", "25", "farfetchd", "nidoran-f". */
export function toSlug(raw: string): string {
  const numeric = /^#?0*(\d{1,4})$/.exec(raw.trim());
  if (numeric) return numeric[1] ?? "";
  const text = raw.replace(/['’]/g, "").replace(/♀/g, " f").replace(/♂/g, " m");
  return normalizeText(text).replace(/ /g, "-");
}

/** Edit distance (insertions, deletions, substitutions). */
export function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * The closest slugs to a misspelled name: names that contain it first, then the smallest edit
 * distance (at most a third of the query's length, so "xyz" suggests nothing).
 */
export function suggestNames(raw: string, names: readonly string[], limit = 3): string[] {
  const query = toSlug(raw);
  if (!query) return [];
  const maxDistance = Math.max(2, Math.floor(query.length / 3));
  return names
    .map((name) => ({
      name,
      score: name.includes(query) ? 0 : levenshtein(query, name),
    }))
    .filter((entry) => entry.score <= maxDistance)
    .sort((a, b) => a.score - b.score || a.name.length - b.name.length)
    .slice(0, limit)
    .map((entry) => entry.name);
}
