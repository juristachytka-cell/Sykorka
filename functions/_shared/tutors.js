// Spoločný kód pre doučovateľov (prihlášky, logá, schvaľovanie)
//
// KV (binding COUNTER):
//   tutors              -> zoznam všetkých prihlášok (bez log)
//   tutorlogo:<id>      -> obrázok loga (240 × 120 px)

export const TUTORS_KEY = "tutors";
export const SLOTS_PER_SIDE = 3;          // koľko log sa zmestí na jednu stranu
export const MAX_PENDING = 30;            // ochrana pred zahltením prihláškami
export const MAX_LOGO_BYTES = 150 * 1024;

export async function readTutors(env) {
  const raw = await env.COUNTER.get(TUTORS_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export const writeTutors = (env, list) => env.COUNTER.put(TUTORS_KEY, JSON.stringify(list));

// IČO: 8 číslic, posledná je kontrolná (modulo 11). Staršie 6-miestne doplníme nulami.
export function normalizeIco(raw) {
  const d = String(raw || "").replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(d)) return null;
  const ico = d.padStart(8, "0");
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(ico[i]) * (8 - i);
  const r = sum % 11;
  const check = r === 0 ? 1 : r === 1 ? 0 : 11 - r;
  return check === Number(ico[7]) ? ico : null;
}

export function normalizeUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (!/\.[a-z]{2,}$/i.test(u.hostname)) return null;
    if (u.username || u.password) return null;
    const out = u.toString();
    return out.length <= 200 ? out : null;
  } catch { return null; }
}

// data:image/...;base64,... -> { bytes, type } alebo null
export function decodeLogo(dataUrl) {
  const m = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  let bin;
  try { bin = atob(m[3]); } catch { return null; }
  if (bin.length > MAX_LOGO_BYTES || bin.length < 100) return null;
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const sig = Array.from(bytes.slice(0, 12));
  const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff;
  const isWebp = String.fromCharCode(...sig.slice(0, 4)) === "RIFF" && String.fromCharCode(...sig.slice(8, 12)) === "WEBP";
  const type = isPng ? "image/png" : isJpg ? "image/jpeg" : isWebp ? "image/webp" : null;
  return type ? { bytes, type } : null;
}

// zapnuté, kým v Cloudflare nie je TUTORS_ENABLED = 0
export const tutorsEnabled = env => String(env.TUTORS_ENABLED ?? "1").trim() !== "0";

// odtlačok IČO (SHA-256) – na kontrolu duplicít aj po vymazaní samotného IČO
export async function icoHash(ico) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("misia9|" + ico));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// verejné údaje schválených doučovateľov
export const publicTutor = t => ({ id: t.id, name: t.name, url: t.url, side: t.side, order: t.order, v: t.updated || t.created });
