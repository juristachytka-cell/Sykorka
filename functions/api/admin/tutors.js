// Cloudflare Pages Function – správa doučovateľov (pre stránku /vysledky)
// Dostupné na: /api/admin/tutors
//
//   GET    /api/admin/tutors              -> všetky prihlášky (aj e-mail a IČO)
//   POST   /api/admin/tutors              -> { id, action: "approve" | "hide" | "update", side: "left"|"right", order }
//   DELETE /api/admin/tutors?id=...       -> zmaže prihlášku aj logo

import { json, guard } from "../../_shared/auth.js";
import { readTutors, writeTutors, SLOTS_PER_SIDE, tutorsEnabled } from "../../_shared/tutors.js";

export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  return json({ tutors: await readTutors(env), slots: SLOTS_PER_SIDE, enabled: tutorsEnabled(env) });
}

export async function onRequestPost({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  let b;
  try { b = await request.json(); } catch { return json({ error: "Neplatné dáta." }, 400); }
  const list = await readTutors(env);
  const t = list.find(x => x.id === b?.id);
  if (!t) return json({ error: "Prihláška sa nenašla." }, 404);
  if (!["approve", "hide", "update"].includes(b.action)) return json({ error: "Neznáma akcia." }, 400);

  const side = b.side === "right" ? "right" : "left";
  const order = Math.max(1, Math.min(SLOTS_PER_SIDE, parseInt(b.order, 10) || 1));
  if (b.action === "approve" || (b.action === "update" && t.status === "approved")) {
    const taken = list.find(x => x.id !== t.id && x.status === "approved" && x.side === side && x.order === order);
    if (taken) return json({ error: `Miesto ${order} na ${side === "left" ? "ľavej" : "pravej"} strane už má „${taken.name}“. Vyber iné miesto.` }, 409);
  }
  if (b.action === "approve") {
    t.status = "approved";
    if (t.ico) { t.icoVerified = true; t.ico = ""; }   // IČO po overení vymažeme (odtlačok icoHash ostáva)
  }
  if (b.action === "hide") t.status = "hidden";
  t.side = side; t.order = order;
  t.updated = new Date().toISOString();
  await writeTutors(env, list);
  return json({ ok: true, tutors: list });
}

export async function onRequestDelete({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const id = new URL(request.url).searchParams.get("id") || "";
  const list = await readTutors(env);
  if (!list.some(t => t.id === id)) return json({ error: "Prihláška sa nenašla." }, 404);
  await env.COUNTER.delete(`tutorlogo:${id}`);
  await writeTutors(env, list.filter(t => t.id !== id));
  return json({ ok: true });
}
