// Spoločný kód pre funkcie správcu (výsledky, doučovatelia)
//
// Prihlásenie (stačí jedno z toho):
//   A) Heslo – v Cloudflare Pages (Settings -> Variables and Secrets) pridaj Secret:
//        ADMIN_PASSWORD   tvoje heslo (NIE rovnaké ako do Cloudflare účtu)
//   B) Cloudflare Access (Zero Trust) – voliteľné, premenné:
//        ACCESS_TEAM_DOMAIN, ACCESS_AUD, ADMIN_EMAIL
// Súbory v priečinku _shared nie sú adresy (API), len pomocný kód.

export const json = (data, status = 200) =>
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
export async function verifyAccess(request, env, fetchFn = fetch) {
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

export async function guard(request, env) {
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

