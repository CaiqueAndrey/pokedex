# Phase 10 — Deploy (Vercel)

## Goal

Put the app online on Vercel with automatic previews per pull request. Done before phase 11 (MCP)
by choice: the MCP server runs locally over stdio and does not depend on the deploy.

## What was built

- `yarn.lock` is now versioned. The original `create-next-app` `.gitignore` ignored it, so CI's
  `yarn install --immutable` could not work and every install resolved fresh versions.
- `package.json` `engines.node` (`>=20.9.0`, Next 16's minimum) so the host picks a supported Node.
- `next.config.ts`: optimized images cached for 31 days (`minimumCacheTTL`) and an
  `IMAGES_UNOPTIMIZED=1` escape hatch for free-tier image quotas.
- `src/config/site.ts` + `metadataBase`: absolute URLs for metadata from `NEXT_PUBLIC_SITE_URL` or
  Vercel's system variables (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`).
- `src/app/robots.ts`: production is crawlable (except `/api/` and `/random`); previews are not.

## Concepts (what, why here, trade-off)

### Git-based deploys and previews

- **What it is:** Vercel builds every push. `main` becomes production; any other branch or pull
  request gets its own preview URL.
- **Why here:** CI (lint, types, tests, build) runs in GitHub Actions; Vercel only builds and hosts.
  A PR shows both the CI result and a live preview.
- **Trade-off:** two builds per push (CI and Vercel). Acceptable for a study project, and it keeps
  the CI provider-independent.

### Caching on serverless

- **What it is:** the app runs as serverless functions. The in-memory caches (`MemoryCache`, the
  index and battle pool memos) live only as long as one function instance.
- **Why it still works:** PokeAPI `fetch` calls use `next.revalidate` (one day), which on Vercel is
  backed by the shared Data Cache, so a cold instance rebuilds the index from cache, not from the
  PokeAPI. The gym pool is one ~80 KB GraphQL call per cold instance, with the recorded snapshot as
  fallback.
- **Trade-off:** the first request on a cold instance is slower than later ones.

### Image optimization quota

- **What it is:** each `next/image` source + size combination is a transformation the host meters.
- **Why here:** the list can show 1,300+ different artworks.
- **Trade-off:** a 31-day TTL spends the quota once per image. If a free plan still runs out,
  `IMAGES_UNOPTIMIZED=1` serves the original PNGs from GitHub: bigger downloads, no usage.

## Decisions

| Decision                 | Alternatives considered        | Why                                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------------------ |
| Vercel Git integration   | Deploy from GitHub Actions     | Previews per PR with no tokens or workflow code to maintain. |
| Corepack for Yarn 4      | `npm`/Yarn 1 on the host       | Same package manager and lockfile as local and CI.           |
| `robots` blocks previews | Password-protect previews only | Previews are public links; they shouldn't compete in search. |

## Gotchas

- Without `ENABLE_EXPERIMENTAL_COREPACK=1` the host may install with a different Yarn than the
  `packageManager` field says.
- `metadataBase` is read at build time; Vercel exposes its system variables to the build.

## How it was verified

- Locally: lint, format, typecheck, unit tests, build and E2E pass; `yarn install --immutable` passes
  with the versioned lockfile.
- On Vercel: production and a preview deployment checked on a phone (to do after the first deploy).
