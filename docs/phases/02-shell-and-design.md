# Phase 02 — Shell and design system

## Goal

A themed, accessible application shell and the UI primitives later phases reuse.

## What was built

- Design tokens (§9) as CSS variables in `globals.css`, exposed to Tailwind via `@theme inline`.
  Light by default; dark follows the system unless the user picked a theme.
- Poppins through `next/font`.
- `config/messages.ts` (all Portuguese UI text, type/stat/generation translations) and
  `config/pokemon-types.ts` (18 types).
- `components/ui`: button, input, select, badge, card, skeleton, empty-state, page-header.
- Header (logo, search, nav, theme toggle), footer with correct credits, skip link.
- `next.config.ts` `images.remotePatterns` for the sprites repository.

## Concepts

### Tokens as CSS variables

Components use `bg-surface`, `text-muted`, never a hex value. Switching theme changes variables, not
class names, so no `dark:` variants are scattered through the code.

### Contrast by calculation

`lib/color.ts` implements the WCAG formula. Each type's text color is picked by
`readableTextOn(color)` and a test asserts ≥ 4.5:1 for all 18 types. Mid-tone backgrounds (fire,
water) get white text; light ones (electric, ice) get near-black.

### Theme without a flash

A tiny inline script in `<head>` copies a saved theme to `data-theme` before first paint.
`ThemeToggle` reads the effective theme with `useSyncExternalStore` (server snapshot: light) so
hydration never mismatches.

## Decisions

| Decision                            | Why                                                   |
| ----------------------------------- | ----------------------------------------------------- |
| Type colors darkened (fire, grass…) | Canonical game colors fail AA with either text color. |
| One font                            | Fewer requests; Poppins covers the weights needed.    |

## How it was verified

Contrast test for all types; axe checks in phase 7 cover both themes.
