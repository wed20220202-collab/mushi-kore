export async function GET() {
  return Response.json({ ok: true, app: "むしコレ＋", phase: 2, categories: ["insect", "fish", "flower", "animal"] });
}
