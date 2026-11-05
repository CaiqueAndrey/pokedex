const NAME_OVERRIDES: Record<string, string> = {
  "mr-mime": "Mr. Mime",
  "mr-rime": "Mr. Rime",
  "mime-jr": "Mime Jr.",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "nidoran-f": "Nidoran ♀",
  "nidoran-m": "Nidoran ♂",
  "type-null": "Type: Null",
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  flabebe: "Flabébé",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** "mr-mime" → "Mr. Mime", "thunder-stone" → "Thunder Stone". */
export function formatName(slug: string): string {
  return NAME_OVERRIDES[slug] ?? slug.split("-").map(capitalize).join(" ");
}

/** 25 → "#0025" */
export function formatNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** API gives decimetres. */
export function decimetresToMetres(dm: number): number {
  return dm / 10;
}

/** API gives hectograms. */
export function hectogramsToKg(hg: number): number {
  return hg / 10;
}

/** Cleans PokeAPI flavor text: form feeds, soft hyphens and line breaks. */
export function cleanFlavorText(text: string): string {
  return text
    .replace(/­\n?/g, "")
    .replace(/[\f\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10 };

export function romanToNumber(roman: string): number {
  let total = 0;
  const chars = roman.toLowerCase().split("");
  chars.forEach((char, index) => {
    const value = ROMAN[char] ?? 0;
    const next = ROMAN[chars[index + 1] ?? ""] ?? 0;
    total += value < next ? -value : value;
  });
  return total;
}

/** "https://pokeapi.co/api/v2/pokemon-species/25/" → 25 */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match) throw new Error(`Cannot read id from url: ${url}`);
  return Number(match[1]);
}

/** "Raichu (Alola)" for forms, "Pikachu" otherwise. */
export function displayName(pokemon: { speciesName: string; form?: { label: string } }): string {
  const base = formatName(pokemon.speciesName);
  return pokemon.form ? `${base} (${pokemon.form.label})` : base;
}

/** 3725 → "01:02:05" (a countdown). */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
