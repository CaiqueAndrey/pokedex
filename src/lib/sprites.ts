import { SPRITES_BASE_URL } from "@/config/pokedex";

export function spriteUrl(id: number, kind: "official" | "shiny" | "default" = "official"): string {
  if (kind === "official") return `${SPRITES_BASE_URL}/other/official-artwork/${id}.png`;
  if (kind === "shiny") return `${SPRITES_BASE_URL}/other/official-artwork/shiny/${id}.png`;
  return `${SPRITES_BASE_URL}/${id}.png`;
}
