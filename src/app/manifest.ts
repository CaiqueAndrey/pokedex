import type { MetadataRoute } from "next";
import { messages } from "@/config/messages";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.appName,
    short_name: messages.appName,
    description: messages.appDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    lang: "pt-BR",
    icons: [
      { src: "/img/pokebola.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/img/pokebola.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
