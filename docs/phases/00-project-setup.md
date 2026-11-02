# Phase 00 — Project setup

## Goal

Replace the 2022 prototype (Next 12, Pages Router, styled-components) with a fresh base in the same
repository, matching the polyglot-lab toolchain. No features yet.

## What was built

- Tag `v0-legacy` on the old state; work on `refactor/restructure`.
- Removed `src/pages`, `src/styles`, `src/contexts`, `src/utils`, `.babelrc`, `.eslintrc.json` and the
  dead dependencies (`js-cookie`, `react-switch`, `polished`, `styled-components`).
- Next 16 + React 19 + TypeScript strict (`noUncheckedIndexedAccess` on, alias `@/*`), Yarn 4
  (`nodeLinker: node-modules`), Tailwind 4, ESLint 9 flat config, Prettier (+ Tailwind class sorting),
  Husky + lint-staged, Vitest, Playwright.
- GitHub Actions CI: lint, format check, typecheck, test, build. No deploy.
- `.env.example`, `AGENTS.md`, `PHASES.md`, phase-note template, real README.

## Concepts

### Rewrite instead of migrate

- **What:** a new tree in the same repo; the old code is reachable through the `v0-legacy` tag.
- **Why here:** four majors of Next, a router change and a styling-library change touch every file.
- **Trade-off:** git blame on the old files is lost in exchange for not carrying legacy shapes along.

### Dropping `.babelrc`

A `.babelrc` makes Next fall back from SWC to Babel, which slows builds and blocks newer features.
Removing it was one of the free wins.

## Gotchas

- Vitest 5 needs `vite` installed explicitly with Yarn's node-modules linker.
- Windows: the Playwright `webServer` accepts an array, which avoids shell-specific `&` backgrounding.

## How it was verified

`yarn lint && yarn typecheck && yarn test && yarn build` all green; Playwright smoke test runs.
