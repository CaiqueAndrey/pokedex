import { NextResponse } from "next/server";
import { getPokedex } from "@/server/pokedex/next-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const all = await getPokedex().listPokemon();
  const species = all.filter((p) => p.isDefault);
  const pick = species[Math.floor(Math.random() * species.length)];
  return NextResponse.redirect(new URL(pick ? `/pokemon/${pick.name}` : "/", request.url));
}
