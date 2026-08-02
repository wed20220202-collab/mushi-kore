export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const publisherId = client?.replace(/^ca-/, "");
  if (!publisherId?.startsWith("pub-")) return new Response("AdSense is not configured.\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
