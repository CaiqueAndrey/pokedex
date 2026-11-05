import type { ReactNode } from "react";

/** OG image size (Facebook, X, WhatsApp previews). */
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The shared frame of every link preview: a colored band (the Pokédex red, or a type's color), a
 * title, a line of text and an optional picture on the right. Text stays dark for contrast. Plain
 * flexbox: ImageResponse supports a subset of CSS.
 */
export function OgCard({
  kicker,
  title,
  text,
  picture,
  accent = "#dc2626",
}: {
  kicker: string;
  title: string;
  text: string;
  picture?: ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff7e6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", height: 24, background: accent }} />
      <div
        style={{ display: "flex", flex: 1, alignItems: "center", padding: "48px 64px", gap: 48 }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
          <div style={{ display: "flex", fontSize: 32, color: "#52525b", fontWeight: 700 }}>
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              color: "#18181b",
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#3f3f46", lineHeight: 1.3 }}>
            {text}
          </div>
        </div>
        {picture}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 64px",
          background: "#18181b",
          color: "#fafafa",
          fontSize: 26,
        }}
      >
        <span>Pokédex</span>
        <span>Ginásio · Quem é? · Emboscada Rocket</span>
      </div>
    </div>
  );
}
