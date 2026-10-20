// Cloudflare Pages Function – súkromný prístup k výsledkom (pre stránku /vysledky)
// Dostupné na: /api/admin/results
//
// Prihlásenie (stačí jedno z toho):
//   A) Heslo – v Cloudflare Pages (Settings -> Variables and Secrets) pridaj Secret:
//        ADMIN_PASSWORD   tvoje heslo (NIE rovnaké ako do Cloudflare účtu)
//   B) Cloudflare Access (Zero Trust) – voliteľné, premenné:
//        ACCESS_TEAM_DOMAIN  napr. misia9.cloudflareaccess.com
//        ACCESS_AUD          "Application Audience (AUD) Tag" z Access aplikácie
//        ADMIN_EMAIL         (nepovinné) pustí len tento e-mail
//
//   GET    /api/admin/results                -> všetky výsledky
//   DELETE /api/admin/results?key=result:... -> zmaže výsledok (aj z rebríčka)

const TOP_KEY = "leaderboard";

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const b64urlToBytes = s => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};
const b64urlToJson = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

// Overí token Cloudflare Access. Vráti e-mail prihláseného alebo null.
async function verifyAccess(request, env, fetchFn = fetch) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return { error: "config" };
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || getCookie(request, "CF_Authorization");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const [h, p, sig] = parts;
    const header = b64urlToJson(h);
    const payload = b64urlToJson(p);
    if (header.alg !== "RS256") return null;

    const team = env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const certs = await fetchFn(`https://${team}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } }).then(r => r.json());
    const jwk = (certs.keys || []).find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.nbf && payload.nbf > now + 60) return null;
    if (payload.iss && payload.iss !== `https://${team}`) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;

    const email = (payload.email || "").toLowerCase();
    if (env.ADMIN_EMAIL && email !== env.ADMIN_EMAIL.trim().toLowerCase()) return null;
    return { email: email || "admin" };
  } catch {
    return null;
  }
}

// Porovnanie hesiel v konštantnom čase
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function guard(request, env) {
  const hasPassword = !!env.ADMIN_PASSWORD;
  const hasAccess = !!(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
  if (!hasPassword && !hasAccess)
    return { res: json({ error: "V Cloudflare nie je nastavené ADMIN_PASSWORD." }, 500) };

  // A) heslo
  const auth = request.headers.get("Authorization") || "";
  const pw = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (hasPassword && pw) {
    if (safeEqual(pw, env.ADMIN_PASSWORD)) return { who: { email: null, method: "password" } };
    await new Promise(r => setTimeout(r, 800)); // spomalí hádanie hesla
    return { res: json({ error: "Nesprávne heslo.", login: "password" }, 401) };
  }

  // B) Cloudflare Access
  if (hasAccess) {
    const who = await verifyAccess(request, env);
    if (who && !who.error) return { who: { ...who, method: "access" } };
  }
  return hasPassword
    ? { res: json({ error: "Zadaj heslo.", login: "password" }, 401) }
    : { res: json({ error: "Prístup zamietnutý. Prihlás sa cez Cloudflare Access.", login: "access" }, 403) };
}

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
