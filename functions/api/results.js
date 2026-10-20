// Cloudflare Pages Function – výsledky hry Sýkorkina misia
// Dostupné na: /api/results
//
// Používa rovnaký KV namespace ako počítadlo (binding: COUNTER).
//
//   GET  /api/results?level=easy|hard   -> dnešný rebríček TOP 10 pre danú úroveň
//   POST /api/results                   -> uloží výsledok { name (anonymná prezývka), city (kraj), level, day, score, timeMs }
//
// Rebríček je denný: o polnoci (slovenský čas) začína nový.
// Všetky výsledky a mazanie: /api/admin/results (len pre správcu).

const TOP_KEEP = 30;      // interne držíme 30 najlepších, zobrazujeme 10
const TOP_SHOW = 10;
const MAX_SCORE = 27;
const MIN_TIME = 20 * 1000;          // rýchlejšie sa 27 otázok poctivo nedá
const MAX_TIME = 3 * 60 * 60 * 1000; // 3 hodiny
const LEVELS = ["easy", "hard"];
const TOP_TTL = 60 * 60 * 24 * 45;   // denné rebríčky sa samy zmažú po 45 dňoch

import { isPseudonym, isKraj } from "../_shared/pseudonym.js";

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const dayKey = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bratislava", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const topKey = (day, level) => `lb:${day}:${level}`;

function clean(raw, max) {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ._\-]/gu, "") // len písmená, číslice, medzera, . _ -
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// lepší výsledok = viac bodov, pri rovnosti kratší čas
const better = (a, b) => b.s - a.s || a.t - b.t;

async function readTop(env, key) {
  const raw = await env.COUNTER.get(key);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

const publicRow = r => ({ name: r.n, city: r.c || "", score: r.s, timeMs: r.t, date: r.d });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const level = LEVELS.includes(url.searchParams.get("level")) ? url.searchParams.get("level") : "easy";
  const day = dayKey();
  const top = (await readTop(env, topKey(day, level))).slice(0, TOP_SHOW).map(publicRow);
  return json({ day, level, top });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Neplatné dáta." }, 400); }

  const n = String(body?.name || "").normalize("NFC").trim();
  const c = String(body?.city || "").normalize("NFC").trim();
  const l = body?.level;
  const s = Number(body?.score);
  const t = Number(body?.timeMs);
  // len anonymné prezývky vygenerované hrou (napr. „Bystrá Sýkorka 42“) a kraj zo zoznamu
  if (!isPseudonym(n)) return json({ error: "Neplatná prezývka." }, 400);
  if (!isKraj(c)) return json({ error: "Neplatný kraj." }, 400);
  if (!LEVELS.includes(l)) return json({ error: "Neplatná úroveň." }, 400);
  if (!Number.isInteger(s) || s < 0 || s > MAX_SCORE) return json({ error: "Neplatné skóre." }, 400);
  if (!Number.isFinite(t) || t < MIN_TIME || t > MAX_TIME) return json({ error: "Neplatný čas." }, 400);

  // hra mohla začať pred polnocou – vtedy patrí do včerajšieho rebríčka
  const now = Date.now();
  const today = dayKey(new Date(now));
  const yesterday = dayKey(new Date(now - 24 * 60 * 60 * 1000));
  const y = body?.day === yesterday ? yesterday : today;

  const rec = { n, c, l, y, s, t: Math.round(t), d: new Date(now).toISOString() };
  // obrátený čas v kľúči -> zoznam je zoradený od najnovších
  const key = `result:${String(9999999999999 - now).padStart(13, "0")}-${crypto.randomUUID().slice(0, 8)}`;
  await env.COUNTER.put(key, JSON.stringify(rec), { metadata: rec, expirationTtl: 60 * 60 * 24 * 180 }); // zmaže sa po 180 dňoch

  // denný rebríček pre úroveň: každá prezývka len raz (jej najlepší výsledok)
  const tk = topKey(y, l);
  let top = await readTop(env, tk);
  const idx = top.findIndex(r => r.n.toLowerCase() === n.toLowerCase());
  const entry = { ...rec, k: key };
  let changed = false;
  if (idx === -1) { top.push(entry); changed = true; }
  else if (better(entry, top[idx]) < 0) { top[idx] = entry; changed = true; }
  top.sort(better);
  top = top.slice(0, TOP_KEEP);
  if (changed && top.some(r => r.k === key)) await env.COUNTER.put(tk, JSON.stringify(top), { expirationTtl: TOP_TTL });

  // miesto najlepšieho výsledku tejto prezývky (aj keď teraz hral horšie)
  const rank = top.findIndex(r => r.n.toLowerCase() === n.toLowerCase()) + 1;
  return json({
    ok: true,
    day: y,
    rank: rank > 0 && rank <= TOP_SHOW ? rank : null,
    personalBest: top.some(r => r.k === key),
    top: top.slice(0, TOP_SHOW).map(publicRow),
  });
}
