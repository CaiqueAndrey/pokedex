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
