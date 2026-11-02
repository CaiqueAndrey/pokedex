/**
 * Absolute base URL of the deployed site, used for metadata (Open Graph, canonical URLs, robots).
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel's production domain → the current Vercel
 * deployment (previews) → local dev.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && production)
    return new URL(`https://${production}`);
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
