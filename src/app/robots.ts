import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_BASE_URL ?? "https://mushi-kore.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}
