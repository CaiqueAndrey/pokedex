import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const nextImports = [
  {
    group: ["next", "next/*", "server-only"],
    message: "The data core must not depend on Next.js.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/server/pokeapi/**", "src/server/pokedex/**", "src/lib/**"],
    ignores: ["src/server/pokedex/next-cache.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: nextImports }] },
  },
]);
