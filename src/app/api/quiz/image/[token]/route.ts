import { decodeImageToken } from "@/lib/quiz";
import { spriteUrl } from "@/lib/sprites";

/** A month: artwork never changes for a given Pokémon. */
const UPSTREAM_REVALIDATE = 60 * 60 * 24 * 30;

/**
 * The quiz picture, proxied: the page asks for an opaque token, so the silhouette's URL doesn't
 * spell out the answer ("…/official-artwork/25.png"). Images only; the PokeAPI JSON is untouched.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = decodeImageToken(token);
  if (id === undefined) return new Response("Not found", { status: 404 });
  const upstream = await fetch(spriteUrl(id, "official"), {
    next: { revalidate: UPSTREAM_REVALIDATE },
  }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return new Response("Image unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
