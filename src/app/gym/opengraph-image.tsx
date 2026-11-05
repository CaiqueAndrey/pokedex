import { ImageResponse } from "next/og";
import { messages } from "@/config/messages";
import { OG_SIZE, OgCard } from "@/features/og/og-card";

export const alt = messages.gym.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard
      kicker={messages.gym.hub.tagline}
      title={messages.gym.title}
      text={messages.gym.description}
    />,
    size,
  );
}
