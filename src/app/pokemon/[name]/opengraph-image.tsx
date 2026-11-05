import { ImageResponse } from "next/og";
import { generationLabel, messages } from "@/config/messages";
import { TYPE_STYLES } from "@/config/pokemon-types";
import { OG_SIZE, OgCard } from "@/features/og/og-card";
import { displayName, formatNumber } from "@/lib/format";
import { spriteUrl } from "@/lib/sprites";
import { getPokedex } from "@/server/pokedex/next-cache";

export const alt = messages.appName;
export const size = OG_SIZE;
export const contentType = "image/png";

/** A Pokémon's link preview: number, name, types and the official artwork. */
export default async function Image({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const detail = await getPokedex()
    .getPokemonDetail(decodeURIComponent(name))
    .catch(() => null);
  if (!detail) {
    return new ImageResponse(
      <OgCard kicker="PokeAPI" title={messages.appName} text={messages.appDescription} />,
      size,
    );
  }
  const types = detail.types.map((type) => TYPE_STYLES[type].label).join(" / ");
  return new ImageResponse(
    <OgCard
      kicker={formatNumber(detail.speciesId)}
      title={displayName(detail)}
      text={`${types} · ${generationLabel(detail.generation)}`}
      accent={TYPE_STYLES[detail.types[0]].color}
      picture={
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
        <img src={spriteUrl(detail.id, "official")} width={420} height={420} alt="" />
      }
    />,
    size,
  );
}
