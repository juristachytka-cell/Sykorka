// Cloudflare Pages Function – výsledky hry Sýkorkina misia
// Dostupné na: /api/results
//
// Používa rovnaký KV namespace ako počítadlo (binding: COUNTER).
//
//   GET  /api/results  -> verejný rebríček TOP 10
//   POST /api/results  -> uloží výsledok { name, score, timeMs }
//
// Všetky výsledky a mazanie: /api/admin/results (chránené cez Cloudflare Access).

const TOP_KEY = "leaderboard";
const TOP_KEEP = 30;      // interne držíme 30 najlepších, zobrazujeme 10
const TOP_SHOW = 10;
const MAX_SCORE = 27;
const MIN_TIME = 20 * 1000;          // rýchlejšie sa 27 otázok poctivo nedá
const MAX_TIME = 3 * 60 * 60 * 1000; // 3 hodiny

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ._\-]/gu, "") // len písmená, číslice, medzera, . _ -
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 2 && name.length <= 20 ? name : null;
}

// lepší výsledok = viac bodov, pri rovnosti kratší čas
const better = (a, b) => b.s - a.s || a.t - b.t;

async function readTop(env) {
  const raw = await env.COUNTER.get(TOP_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

const publicRow = r => ({ name: r.n, score: r.s, timeMs: r.t, date: r.d });

export async function onRequestGet({ env }) {
  const top = (await readTop(env)).slice(0, TOP_SHOW).map(publicRow);
  return json({ top });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Neplatné dáta." }, 400); }

  const n = cleanName(body?.name);
  const s = Number(body?.score);
  const t = Number(body?.timeMs);
  if (!n) return json({ error: "Prezývka musí mať 2 až 20 znakov." }, 400);
  if (!Number.isInteger(s) || s < 0 || s > MAX_SCORE) return json({ error: "Neplatné skóre." }, 400);
  if (!Number.isFinite(t) || t < MIN_TIME || t > MAX_TIME) return json({ error: "Neplatný čas." }, 400);

  const now = Date.now();
  const rec = { n, s, t: Math.round(t), d: new Date(now).toISOString() };
  // obrátený čas v kľúči -> zoznam je zoradený od najnovších
  const key = `result:${String(9999999999999 - now).padStart(13, "0")}-${crypto.randomUUID().slice(0, 8)}`;
  await env.COUNTER.put(key, JSON.stringify(rec), { metadata: rec });

  // rebríček: každá prezývka len raz (jej najlepší výsledok)
  let top = await readTop(env);
  const idx = top.findIndex(r => r.n.toLowerCase() === n.toLowerCase());
  const entry = { ...rec, k: key };
  let changed = false;
  if (idx === -1) { top.push(entry); changed = true; }
  else if (better(entry, top[idx]) < 0) { top[idx] = entry; changed = true; }
  top.sort(better);
  top = top.slice(0, TOP_KEEP);
  if (changed && top.some(r => r.k === key)) await env.COUNTER.put(TOP_KEY, JSON.stringify(top));

  // miesto najlepšieho výsledku tejto prezývky (aj keď teraz hral horšie)
  const rank = top.findIndex(r => r.n.toLowerCase() === n.toLowerCase()) + 1;
  return json({
    ok: true,
    rank: rank > 0 && rank <= TOP_SHOW ? rank : null,
    personalBest: top.some(r => r.k === key),
    top: top.slice(0, TOP_SHOW).map(publicRow),
  });
}
