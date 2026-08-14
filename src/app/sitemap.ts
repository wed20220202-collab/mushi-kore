import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/privacy", "/terms", "/contact"].map((path, index) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-08-02"),
    changeFrequency: index === 0 ? "weekly" as const : "monthly" as const,
    priority: index === 0 ? 1 : 0.6,
  }));
}
