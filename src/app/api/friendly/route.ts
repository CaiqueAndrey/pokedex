import { NextResponse } from "next/server";
import { z } from "zod";
import { TEAM_SIZE } from "@/config/gym";
import { friendlyOpponent } from "@/lib/battle/friendly";
import { newSeed } from "@/lib/battle/rng";
import { toBattlePokemon } from "@/lib/battle/team";
import { getBattlePool, getPokedex } from "@/server/pokedex/next-cache";

const querySchema = z.object({
  team: z.string().min(1).max(600),
  leader: z.enum(["easy", "hard"]),
  seed: z
    .string()
    .regex(/^[\w-]{1,40}$/)
    .optional(),
});

/**
 * A friendly battle for "Meu time": your team (any Pokémon, forms included) as fighters, and the
 * leader's team for it. The browser simulates the battle with the same engine as the gym.
 */
export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const { team: names, leader } = parsed.data;
  const seed = parsed.data.seed ?? newSeed();
  try {
    const pokedex = getPokedex();
    const details = await Promise.all(
      names
        .split(",")
        .slice(0, TEAM_SIZE)
        .map((name) => pokedex.getPokemonDetail(name)),
    );
    const team = details.flatMap((detail) => (detail ? [toBattlePokemon(detail)] : []));
    if (team.length === 0) return NextResponse.json({ error: "Empty team" }, { status: 400 });
    const [pool, relations] = await Promise.all([getBattlePool(), pokedex.getTypeRelations()]);
    const opponent = friendlyOpponent(pool, leader, seed, team[0], relations);
    return NextResponse.json({ seed, team, opponent });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
