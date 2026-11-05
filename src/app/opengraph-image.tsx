import { ImageResponse } from "next/og";
import { messages } from "@/config/messages";
import { OG_SIZE, OgCard } from "@/features/og/og-card";

export const alt = messages.appName;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard kicker="PokeAPI" title={messages.appName} text={messages.appDescription} />,
    size,
  );
}
