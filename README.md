# Sýkorkina misia – Misia9.sk (Cloudflare Pages)

Statický web + jedna Cloudflare Pages Function (počítadlo návštev v KV).

## Súbory
```
index.html            hra: 9 kôl × 3 otázky, 2 úrovne, zvuky, chyby s vysvetlením, odznaky, finále na strome
otazky.js             zásoba 306 otázok (2 úrovne × 9 tém × 17 viet)
functions/api/counter.js   počítadlo návštev (GET /api/counter)
functions/api/results.js   výsledky hráčov: prezývka, body, čas + verejný rebríček TOP 10 (/api/results)
functions/api/admin/results.js   všetky výsledky + mazanie, len pre správcu (heslo, voliteľne Cloudflare Access)
vysledky.html         súkromná stránka so všetkými výsledkami (chránená heslom, skrytá pred Googlom)
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
   Výsledky hráčov sa ukladajú do toho istého KV, netreba nič nové zakladať.
3. **Heslo pre stránku s výsledkami:** projekt misia9 → Settings → Variables and Secrets → Add →
   typ **Secret**, názov `ADMIN_PASSWORD`, hodnota = tvoje nové heslo → Save → Deployments → **Retry deployment**.
   Nepoužívaj rovnaké heslo ako do Cloudflare účtu. Výsledky nájdeš na https://misia9.sk/vysledky
4. Po nasadení: Google Search Console a Bing Webmaster Tools → pridaj misia9.sk → odošli `https://misia9.sk/sitemap.xml`.
5. Skontroluj zdieľanie: https://developers.facebook.com/tools/debug/ a štruktúrované dáta: https://search.google.com/test/rich-results


## Otázky, rebríček a odznaky
- **Otázky dňa:** každý deň o polnoci (slovenský čas) hra vyberie z každej témy 3 vety – pre všetkých hráčov rovnaké.
  Vety sa striedajú v kruhu: 5 dní po sebe sa žiadna neopakuje, za 17 dní sa vystriedajú všetky.
- **Úrovne:** 🌱 Ľahšia (3. – 5. ročník) a 🔥 Ťažšia (6. – 9. ročník), každá má vlastný rebríček.
- **Denný rebríček TOP 10:** viac bodov vyhráva, pri rovnosti rýchlejší čas; každá prezývka len raz. O polnoci začína nový.
- **Mesto** je nepovinné a zobrazí sa pri prezývke v rebríčku.
- **Odznaky** (12 druhov) sa ukladajú v prehliadači hráča, nie na serveri.
- **Zvuky** (čvirikanie) sa generujú v prehliadači, dajú sa vypnúť tlačidlom 🔊 v hlavičke.
- Na /vysledky vidíš všetky hry (aj mesto a úroveň), štatistiky, filter, export do CSV a mazanie nevhodných prezývok.
- Bezplatný Cloudflare KV zvládne cca 1 000 zápisov denne (počítadlo + výsledky spolu). Pri stovkách hier denne zváž plán Workers Paid (5 USD/mesiac).

## Úprava otázok
Otázky sú v súbore `otazky.js`. Každá veta má tvar `["veta s chybou", "chybné slovo", ["správne slovo", "správne slovo"], "vysvetlenie"]`.
Obe ponúknuté správne slová musia byť vo vete. V každej téme nech ostane rovnaký počet viet (teraz 17).

## Voliteľne: prihlásenie cez Cloudflare Access namiesto hesla
(Zero Trust môže pri registrácii vyžadovať platobnú kartu aj pri pláne Free. Heslo funguje bez toho.)
1. Cloudflare → v ľavom menu **Zero Trust**. Pri prvom otvorení si zvoľ názov tímu (napr. `misia9`) a plán **Free** (do 50 ľudí zadarmo).
   Adresa tímu potom bude `misia9.cloudflareaccess.com`.
2. Zero Trust → **Access → Applications → Add an application → Self-hosted**.
   - Názov: `Výsledky Sýkorkina misia`, Session duration napr. 1 month
   - Doména (Public hostname): `misia9.sk`, Path: `vysledky`
   - Pridaj druhú doménu: `misia9.sk`, Path: `api/admin`
3. Pravidlo (Policy): Action **Allow**, Include → **Emails** → tvoj e-mail, ktorým sa prihlasuješ do Cloudflare.
4. Ulož. V detaile aplikácie skopíruj **Application Audience (AUD) Tag**.
5. Workers & Pages → projekt misia9 → **Settings → Variables and Secrets** → pridaj:
   - `ACCESS_TEAM_DOMAIN` = `misia9.cloudflareaccess.com` (podľa tvojho názvu tímu)
   - `ACCESS_AUD` = skopírovaný AUD tag
   - `ADMIN_EMAIL` = tvoj e-mail (poistka – pustí iba tento e-mail)
6. **Deployments → Retry deployment**, aby sa premenné prejavili.

Prihlásenie: otvoríš misia9.sk/vysledky → Cloudflare ťa vyzve na e-mail → príde ti kód → si dnu.
Funkcia navyše sama overuje podpis od Cloudflare, takže výsledky sa nedajú stiahnuť ani cez adresu *.pages.dev.
Heslo aj Access môžu fungovať súčasne.
