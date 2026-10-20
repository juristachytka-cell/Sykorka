// Cloudflare Pages Function – logo doučovateľa
// Dostupné na: /api/tutors/logo?id=...
// Verejne sa zobrazí len logo schváleného doučovateľa; čakajúce logo vidí iba správca.

import { guard } from "../../_shared/auth.js";
import { readTutors, tutorsEnabled } from "../../_shared/tutors.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-f0-9]{12}$/.test(id)) return new Response("Not found", { status: 404 });
  const t = (await readTutors(env)).find(x => x.id === id);
  if (!t) return new Response("Not found", { status: 404 });
  const approved = t.status === "approved" && tutorsEnabled(env);
  if (!approved) {
    const g = await guard(request, env);
    if (g.res) return new Response("Not found", { status: 404 });
  }
  const { value, metadata } = await env.COUNTER.getWithMetadata(`tutorlogo:${id}`, { type: "arrayBuffer" });
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, {
    headers: {
      "Content-Type": (metadata && metadata.type) || "image/png",
      "Cache-Control": approved ? "public, max-age=86400" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
