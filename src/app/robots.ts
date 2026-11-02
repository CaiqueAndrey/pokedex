import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must not be indexed: only production allows crawlers.
  const isProduction = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;
  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/", disallow: ["/api/", "/random"] }
      : { userAgent: "*", disallow: "/" },
    host: siteUrl().origin,
  };
}
