import { ImageResponse } from "next/og";
import { messages } from "@/config/messages";
import { OG_SIZE, OgCard } from "@/features/og/og-card";

export const alt = messages.quiz.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard
      kicker={messages.quiz.banner.text}
      title={messages.quiz.title}
      text={messages.quiz.description}
      accent="#0284c7"
      picture={
        <div
          style={{
            display: "flex",
            width: 280,
            height: 280,
            borderRadius: 40,
            background: "#0284c7",
            color: "white",
            fontSize: 220,
            fontWeight: 800,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ?
        </div>
      }
    />,
    size,
  );
}
