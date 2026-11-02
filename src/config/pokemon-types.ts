import { readableTextOn } from "@/lib/color";
import { POKEMON_TYPES, type PokemonTypeName } from "@/types/pokemon";
import { TYPE_LABELS } from "./messages";

// Base colors. Text color is derived by contrast (see color.ts) and verified by a test (WCAG AA).
const TYPE_COLORS: Record<PokemonTypeName, string> = {
  normal: "#A8A77A",
  fire: "#B93A12",
  water: "#3D6FD1",
  electric: "#F7D02C",
  grass: "#3F7D1F",
  ice: "#96D9D6",
  fighting: "#B22A24",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#8A9A16",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

export interface TypeStyle {
  label: string;
  color: string;
  textColor: string;
}

export const TYPE_STYLES = Object.fromEntries(
  POKEMON_TYPES.map((type) => [
    type,
    {
      label: TYPE_LABELS[type],
      color: TYPE_COLORS[type],
      textColor: readableTextOn(TYPE_COLORS[type]),
    },
  ]),
) as Record<PokemonTypeName, TypeStyle>;
