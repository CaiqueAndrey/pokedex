import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E uses its own build dir so it can run next to a normal `yarn dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
    // Sprites never change for a given URL: keep optimized copies for 31 days instead of 4 hours,
    // so the hosting image-optimization quota is spent once per image, not every few hours.
    minimumCacheTTL: 2678400,
    // Escape hatch for free hosting tiers: set IMAGES_UNOPTIMIZED=1 to serve the sprites straight
    // from GitHub (bigger downloads, zero optimization usage).
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "1",
  },
};

export default nextConfig;
