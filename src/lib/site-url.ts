const DEFAULT_SITE_URL = "https://mushi-kore.vercel.app";

export function getSiteUrl(value = process.env.APP_BASE_URL) {
  try {
    const url = new URL(value || DEFAULT_SITE_URL);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
