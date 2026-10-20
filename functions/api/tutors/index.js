// Cloudflare Pages Function – doučovatelia
// Dostupné na: /api/tutors
//
//   GET  /api/tutors   -> schválení doučovatelia (zobrazujú sa po stranách hry na notebooku)
//   POST /api/tutors   -> nová prihláška { name, url, ico, email, logo (data URL), consent }
//                         Prihláška čaká na schválenie správcom na stránke /vysledky.

import { NickFilter } from "../../_shared/nickfilter.js";
import { readTutors, writeTutors, normalizeIco, normalizeUrl, decodeLogo, publicTutor, MAX_PENDING } from "../../_shared/tutors.js";

const json = (data, status = 200, cache = "no-store") =>
  Response.json(data, { status, headers: { "Cache-Control": cache } });

export async function onRequestGet({ env }) {
  const list = (await readTutors(env))
    .filter(t => t.status === "approved")
    .sort((a, b) => (a.side === b.side ? a.order - b.order : a.side < b.side ? -1 : 1))
    .map(publicTutor);
  return json({ tutors: list }, 200, "public, max-age=300");
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Neplatné dáta." }, 400); }
  if (b?.website) return json({ ok: true }); // pasca na roboty (skryté pole)

  const name = String(b?.name || "").normalize("NFC").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 60) return json({ error: "Názov musí mať 3 až 60 znakov." }, 400);
  if (NickFilter.check(name, "city").reason === "vulgar") return json({ error: "Názov obsahuje nevhodné slovo." }, 400);

  const url = normalizeUrl(b?.url);
  if (!url) return json({ error: "Zadaj platnú adresu webovej stránky, napr. https://mojedoucovanie.sk" }, 400);

  const ico = normalizeIco(b?.ico);
  if (!ico) return json({ error: "IČO nie je platné. Skontroluj prosím všetkých 8 číslic." }, 400);

  const email = String(b?.email || "").trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/i.test(email)) return json({ error: "Zadaj platný kontaktný e-mail." }, 400);

  if (b?.consent !== true) return json({ error: "Potvrď prosím súhlas s podmienkami." }, 400);

  const logo = decodeLogo(b?.logo);
  if (!logo) return json({ error: "Logo sa nepodarilo spracovať. Použi obrázok PNG, JPG alebo WebP." }, 400);

  const list = await readTutors(env);
  if (list.some(t => t.ico === ico && t.status !== "hidden")) return json({ error: "Prihláška s týmto IČO už existuje. Ak chceš zmeniť údaje, napíš správcovi stránky." }, 409);
  if (list.filter(t => t.status === "pending").length >= MAX_PENDING) return json({ error: "Momentálne čaká veľa prihlášok. Skús to prosím o pár dní." }, 429);

  const now = new Date().toISOString();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await env.COUNTER.put(`tutorlogo:${id}`, logo.bytes, { metadata: { type: logo.type } });
  list.push({ id, name, url, ico, email, status: "pending", side: "left", order: 99, created: now, updated: now, logoType: logo.type });
  await writeTutors(env, list);
  return json({ ok: true });
}
