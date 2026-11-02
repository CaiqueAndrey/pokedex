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
  },
};

export default nextConfig;
