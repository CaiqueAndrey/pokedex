# Phase 07 — Compare and polish

## Goal

Finish the product: comparison, small extras, an accessibility pass, a performance pass and an
installable web app.

## What was built

- `/compare?a=…&b=…`: stats side by side, the higher value highlighted (and announced to screen
  readers), swap button, pickers that update the URL.
- Random Pokémon (`/random` route handler → redirect), `/` shortcut to focus search, theme toggle
  persisted in `localStorage`.
- Web app manifest (`app/manifest.ts`) + icons, apple icon, theme color.
- README with usage and scripts.

## Accessibility pass

- Skip link, visible focus ring (`:focus-visible`), labeled search field, `aria-pressed` on toggles,
  `aria-current` on pagination/forms/evolution, tables with captions and `scope`.
- Targets ≥ 44×44 px; `prefers-reduced-motion` disables animation.
- **Automated:** `e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1 A + AA) on 7 pages in light _and_ dark.
  It found real bugs, all fixed: the type buttons used `opacity-70` (contrast), the "winner" color
  (`primary-600` text on the surface color) was below 4.5:1 and a `<dl>` contained a stray `<div>`.
  Lesson: don't signal state with color alone; use weight/background/underline plus text for AT.

## Performance pass

Measured with Lighthouse (mobile preset, production build, fixture API, real sprites from GitHub):

| Page               | Performance | Accessibility | Best practices | SEO |
| ------------------ | ----------- | ------------- | -------------- | --- |
| `/`                | 81          | 100           | 100            | 100 |
| `/pokemon/pikachu` | 95          | 100           | 100            | 91  |

- Home LCP (~5 s under throttling) is the first artwork, optimized on demand by `next/image` on a cold
  server; later visits hit the image cache. Mitigation already in: `priority` + responsive `sizes`.
- CLS 0, TBT ≤ 60 ms. Client JS is limited to search, filters, toggles and stores; lists, stats,
  effectiveness and evolution are Server Components.
- Detail-page SEO 91: Lighthouse reports a missing `meta description`. Likely cause (not
  verified): Next streams page metadata after the shell for regular user agents. Worth checking
  before the deploy phase.

## Concepts

### Progressive enhancement of a server-rendered app

Everything works as links and server rendering; client JavaScript only adds debounce, toggles and
persistence. If a client bundle fails, lists, pagination and detail pages still navigate.

## How it was verified

Vitest (51 tests), Playwright (16 behaviour + 14 axe tests), Lighthouse, `yarn build`.
