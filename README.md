# Sýkorkina misia – Misia9.sk (Cloudflare Pages)

Statický web + jedna Cloudflare Pages Function (počítadlo návštev v KV).

## Súbory
```
index.html            hra: 9 kôl × 3 otázky, hláška po kole, finále – sýkorka si sadne na strom
functions/api/counter.js   počítadlo návštev (GET /api/counter)
favicon.ico / favicon.svg / favicon-32x32.png   favikon so sýkorkou
apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest   ikony pre mobil
og-image.png          obrázok pri zdieľaní (Facebook, WhatsApp…) 1200×630
robots.txt            povolené vyhľadávače aj AI roboty, odkaz na sitemap
sitemap.xml           mapa stránky
llms.txt              krátky popis stránky pre AI asistentov (ChatGPT, Claude, Perplexity…)
llms-full.txt         všetkých 27 otázok s vysvetleniami pre AI
_headers              hlavičky pre Cloudflare (bezpečnosť, cache, typy súborov)
```

## Nasadenie
1. Cloudflare → Workers & Pages → projekt misia9 → nahraj obsah tohto priečinka (alebo `npx wrangler pages deploy . --project-name=misia9`).
2. KV binding ostáva rovnaký: Settings → Functions → KV namespace bindings → premenná `COUNTER`.
3. Po nasadení: Google Search Console a Bing Webmaster Tools → pridaj misia9.sk → odošli `https://misia9.sk/sitemap.xml`.
4. Skontroluj zdieľanie: https://developers.facebook.com/tools/debug/ a štruktúrované dáta: https://search.google.com/test/rich-results

## Úprava otázok
Otázky sú v `index.html` v poli `rounds`. Ak ich zmeníš, uprav aj `llms-full.txt` a dátum `lastmod` v `sitemap.xml`.
