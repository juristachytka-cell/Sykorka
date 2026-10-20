// Cloudflare Pages Function – súkromný prístup k výsledkom (pre stránku /vysledky)
// Dostupné na: /api/admin/results
//
// Prihlásenie správcu: pozri functions/_shared/auth.js (ADMIN_PASSWORD alebo Cloudflare Access)
//
//   GET    /api/admin/results                -> všetky výsledky
//   DELETE /api/admin/results?key=result:... -> zmaže výsledok (aj z rebríčka)

const TOP_KEY = "leaderboard";

import { json, guard } from "../../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const rows = [];
  let cursor;
  do {
    const page = await env.COUNTER.list({ prefix: "result:", cursor });
    for (const k of page.keys) {
      const m = k.metadata;
      if (m) rows.push({ key: k.name, name: m.n, city: m.c || "", level: m.l || "", day: m.y || "", score: m.s, timeMs: m.t, date: m.d });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return json({ user: g.who.email, method: g.who.method, results: rows });
}

export async function onRequestDelete({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("result:")) return json({ error: "Neplatný kľúč." }, 400);
  const { metadata } = await env.COUNTER.getWithMetadata(key);
  await env.COUNTER.delete(key);
  // odstráni výsledok aj z denného rebríčka (a zo starého spoločného rebríčka)
  const boards = [TOP_KEY];
  if (metadata && metadata.y && metadata.l) boards.push(`lb:${metadata.y}:${metadata.l}`);
  for (const bk of boards) {
    let top = [];
    try { top = JSON.parse((await env.COUNTER.get(bk)) || "[]"); } catch {}
    const filtered = top.filter(r => r.k !== key);
    if (filtered.length !== top.length) await env.COUNTER.put(bk, JSON.stringify(filtered), { expirationTtl: 60 * 60 * 24 * 45 });
  }
  return json({ ok: true });
}
