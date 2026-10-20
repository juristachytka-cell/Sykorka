// Cloudflare Pages Function – výsledky hry Sýkorkina misia
// Dostupné na: /api/results
//
// Používa rovnaký KV namespace ako počítadlo (binding: COUNTER).
//
//   GET  /api/results?level=easy|hard   -> dnešný rebríček TOP 10 pre danú úroveň
//   POST /api/results                   -> uloží výsledok { name, city, level, day, score, timeMs }
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

// ===== Kontrola prezývky a mesta: vulgarizmy a nezmyselné slová =====
// (rovnaký kód je aj v hre v index.html)
const NickFilter = (() => {
  // korene vulgárnych a urážlivých slov (bez diakritiky, malými písmenami)
  const VULGAR = [
    "kurv", "kurev", "kurw", "kurva", "pica", "picu", "picus", "picov", "picin", "picka", "pizd", "kunda",
    "kokot", "kkt", "debil", "kreten", "idiot", "imbecil", "blbec", "chuj", "hovn", "hovad", "srac", "zasr", "posr",
    "jeb", "mrd", "zmrd", "sukat", "sukam", "suka", "prdel", "hajzl", "hajzel", "chcan", "buzerant", "buzna",
    "cigan", "negr", "nigg", "teplos", "teplous", "fuck", "shit", "bitch", "dick", "cock", "pussy", "cunt",
    "asshole", "porn", "sex", "penis", "vagin", "nazi", "hitler", "heil", "kkk", "fck", "fuk"
  ];
  // bežné slová a názvy, ktoré náhodou obsahujú niektorý z koreňov (Hviezdička, Opica, Smrdáky…)
  const ALLOW = ["hviezdick", "opic", "apic", "smrdak", "picass", "kokos", "sukn"];
  // typické skúšobné a „prázdne“ prezývky
  const TEST = new Set([
    "test", "testik", "tester", "testovanie", "testy", "skuska", "skusam", "skusobna", "skusobny", "skuskova",
    "asdf", "asd", "qwe", "qwer", "qwerty", "qwertz", "yxcv", "abc", "abcd", "abcde", "xxx", "xyz", "xy", "aaa",
    "nic", "nikto", "neviem", "anonym", "anonim", "nobody", "noname", "admin", "user", "hrac", "prezyvka", "meno",
    "nick", "nickname", "lol", "haha", "hihi", "hehe", "blabla", "bla", "dsa", "sdf", "ok", "okok", "null",
    "undefined", "nan", "jj", "kk", "hh", "aa", "ss", "dd", "ff", "gg"
  ]);
  const ROWS = ["qwertzuiop", "qwertyuiop", "asdfghjkl", "yxcvbnm", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i" };

  const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const deleet = s => s.replace(/[0134578@$!]/g, ch => LEET[ch]);
  const lettersOnly = s => s.replace(/[^a-z]/g, "");
  const collapse = s => s.replace(/(.)\1+/g, "$1");

  function check(raw, kind = "nick") {
    const p = plain(raw);
    const letters = lettersOnly(p);
    const leet = lettersOnly(deleet(p));
    // 1) vulgarizmy (aj s medzerami, bodkami, číslami namiesto písmen či zdvojenými písmenami)
    const unallow = v => ALLOW.reduce((acc, w) => acc.split(w).join("_"), v);
    for (const v of [letters, leet, collapse(letters), collapse(leet)].map(unallow)) {
      if (VULGAR.some(w => v.includes(w))) return { ok: false, reason: "vulgar" };
    }
    if (kind === "city" && !letters) return { ok: true };
    // 2) nezmyselné slová
    if (letters.length < 2) return { ok: false, reason: "nonsense" };
    const base = p.replace(/[^a-z0-9]/g, "").replace(/\d+$/, "");
    if (TEST.has(base) || TEST.has(letters) || TEST.has(collapse(letters))) return { ok: false, reason: "nonsense" };
    if (/(.)\1{3,}/.test(p.replace(/\s/g, ""))) return { ok: false, reason: "nonsense" };          // aaaa, 1111
    if (/^(.{1,3})\1{2,}$/.test(letters)) return { ok: false, reason: "nonsense" };                 // hahaha, ababab
    const compact = p.replace(/[^a-z0-9]/g, "");
    for (let i = 0; i + 4 <= compact.length; i++) {                                                  // asdf, qwer, 1234
      const g = compact.slice(i, i + 4), r = g.split("").reverse().join("");
      if (ROWS.some(row => row.includes(g) || row.includes(r))) return { ok: false, reason: "nonsense" };
    }
    for (const word of p.split(/[^a-z]+/).filter(Boolean)) {                                        // xkcdfg, bcdf
      if (/[^aeiouyrl]{5,}/.test(word)) return { ok: false, reason: "nonsense" };
      if (word.length >= 4 && !/[aeiouy]/.test(word.replace(/[rl]/g, "a"))) return { ok: false, reason: "nonsense" };
    }
    return { ok: true };
  }
  return { check };
})();

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

  const n = clean(body?.name, 40);
  const c = clean(body?.city, 30);
  const l = body?.level;
  const s = Number(body?.score);
  const t = Number(body?.timeMs);
  if (n.length < 2 || n.length > 20) return json({ error: "Prezývka musí mať 2 až 20 znakov." }, 400);
  const cn = NickFilter.check(n);
  if (!cn.ok) return json({ error: cn.reason === "vulgar" ? "Táto prezývka sa nedá použiť." : "Prezývka nevyzerá ako skutočná prezývka." }, 400);
  if (c && !NickFilter.check(c, "city").ok) return json({ error: "Názov mesta sa nedá použiť." }, 400);
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
  await env.COUNTER.put(key, JSON.stringify(rec), { metadata: rec });

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
