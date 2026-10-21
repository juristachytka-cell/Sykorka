# Sýkorkina misia – Misia9.sk (Cloudflare Pages)

Statický web + jedna Cloudflare Pages Function (počítadlo návštev v KV).

## Súbory
```
styles.css + fonts/   štýly a písma priamo na webe (žiadne Google Fonts ani CDN)
sukromie.html         Ochrana súkromia a podmienky používania
index.html            hra: 9 kôl × 3 otázky, 2 úrovne, zvuky, chyby s vysvetlením, odznaky, finále na strome
otazky.js             slovenčina: 1 000 otázok (2 úrovne × 15 tém)
otazky-en.js          angličtina: 600 otázok (2 úrovne × 10 tém)
functions/api/counter.js   počítadlo návštev (GET /api/counter)
functions/api/results.js   výsledky hráčov: prezývka, body, čas + verejný rebríček TOP 10 (/api/results)
functions/api/admin/results.js   všetky výsledky + mazanie, len pre správcu (heslo, voliteľne Cloudflare Access)
vysledky.html         súkromná stránka: výsledky hráčov + schvaľovanie doučovateľov (chránená heslom)
pridat-doucovatela.html   formulár pre súkromných doučovateľov (logo, názov, web, IČO, e-mail)
functions/api/tutors/      prihlášky doučovateľov a ich logá
functions/api/admin/tutors.js   schvaľovanie, presun, skrytie a mazanie doučovateľov
functions/_shared/         spoločný kód (prihlásenie správcu, filter slov, doučovatelia)
favicon.ico / favicon.svg / favicon-32x32.png   favikon so sýkorkou
apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest   ikony pre mobil
og-image.png          obrázok pri zdieľaní (Facebook, WhatsApp…) 1200×630
robots.txt            povolené vyhľadávače aj AI roboty, odkaz na sitemap
sitemap.xml           mapa stránky
llms.txt              krátky popis stránky pre AI asistentov (ChatGPT, Claude, Perplexity…)
llms-full.txt         ukážky otázok z každej témy s vysvetleniami pre AI
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
- **Predmety:** 📝 Slovenčina (15 tém na úroveň) a 🇬🇧 Angličtina (10 tém na úroveň). Predmet aj úroveň si hráč vyberie
  na úvodnej kartičke; každá kombinácia (easy, hard, en_easy, en_hard) má vlastné otázky aj vlastný denný rebríček.
- **Otázky dňa:** každý deň o polnoci (slovenský čas) hra vyberie 9 tém a z každej 3 vety – pre všetkých hráčov rovnaké.
  Slovenčina: témy sa striedajú v 5-dňových blokoch (každá téma 3 dni z 5). Angličtina: každý deň sa vynechá iná
  téma z 10. Vety v každej téme sa striedajú v kruhu, takže sa dlho neopakujú.
- **Angličtina:** vysvetlenia sú po slovensky, tlačidlo 🔊 prečíta vetu nahlas hlasom prehliadača (nič sa neposiela von).
- **Ovládanie:** odpoveď sa dá vybrať aj klávesmi 1 – 3.
- **Úrovne:** 🌱 Ľahšia (3. – 5. ročník) a 🔥 Ťažšia (6. – 9. ročník).
- **Denný rebríček TOP 10:** viac bodov vyhráva, pri rovnosti rýchlejší čas; každá prezývka len raz. O polnoci začína nový.
- **Prezývky** generuje hra (anonymné), **kraj** je nepovinný a zobrazí sa pri prezývke v rebríčku.
- **Do rebríčka sa počíta len prvá súťažná hra dňa** v každom predmete a úrovni (v danom prehliadači). Ďalšie hry sú tréning.
- **Tréning** („Najprv si to vyskúšam“): s inými vetami než v dnešnej súťaži, nič sa neukladá.
- **Odznaky** (14 druhov, aj 🌍 Svetobežník a 🎓 Dvojjazyčná sýkorka) sa ukladajú v prehliadači hráča, nie na serveri.
- **Zvuky** (čvirikanie) sa generujú v prehliadači, dajú sa vypnúť tlačidlom 🔊 v hlavičke.
- Na /vysledky vidíš všetky hry (aj kraj, predmet a úroveň), štatistiky, filter, export do CSV a mazanie nevhodných prezývok.
- Bezplatný Cloudflare KV zvládne cca 1 000 zápisov denne (počítadlo + výsledky spolu). Pri stovkách hier denne zváž plán Workers Paid (5 USD/mesiac).

## Úprava otázok
Otázky sú v súboroch `otazky.js` (slovenčina) a `otazky-en.js` (angličtina). Každá veta má tvar `["veta s chybou", "chybné slovo", ["správne slovo", "správne slovo"], "vysvetlenie"]`.
Obe ponúknuté správne slová musia byť vo vete. Témy môžu mať rôzny počet viet (aspoň 6). Slovenčina má 15 tém na úroveň, angličtina 10.

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

## Doučovatelia po stranách hry
- Na širokých obrazovkách (od 1320 px – notebook, počítač) sú logá **po stranách hry**, 3 vľavo a 3 vpravo (6 miest), s označením „propagácia zadarmo“.
  Na mobile, tablete a menšom notebooku sú tie isté karty **dole na stránke nad riadkom s copyrightom**.
  Odkazy majú `rel="sponsored"`, ako to vyžaduje Google pri platených či partnerských odkazoch.
- Doučovateľ vyplní formulár na **misia9.sk/pridat-doucovatela**: názov, web, IČO (kontroluje sa kontrolná číslica), e-mail a logo.
  Logo sa v prehliadači automaticky upraví na **240 × 120 px** s bielym pozadím (max. 150 kB).
- Prihláška čaká na schválenie. Na **misia9.sk/vysledky → záložka Doučovatelia**:
  1. over IČO v registri (odkazy sú priamo na stránke) a skontroluj web,
  2. vyber stranu a miesto (1 – 3) a klikni **Schváliť a zobraziť**,
  3. neskôr môžeš logo **Presunúť**, **Skryť** alebo **Zmazať**.
- Kým nie je logo schválené, verejne sa nedá zobraziť. Kým je na strane voľné miesto, zobrazí sa tam pozvánka „Ste doučovateľ? Tu môže byť vaše logo“.
- E-mail a IČO doučovateľa vidíš len ty, verejne sa nezobrazujú. Doučovateľovi po schválení napíš e-mail sama (stránka e-maily neposiela).

## Zdieľanie výsledku
- Po hre sa v časti „Výsledok misie“ vytvorí obrázok 1080 × 1080 (prezývka, skóre, čas, úroveň, miesto v rebríčku, sýkorka na strome).
- Tlačidlá: **Zdieľať…** (na mobile ponuka telefónu – Instagram, WhatsApp, Messenger, EduPage, e-mail – aj s obrázkom),
  **Facebook**, **WhatsApp**, **E-mail**, **EduPage** (skopíruje text s odkazom na vloženie do správy),
  **Instagram – obrázok** (stiahne obrázok) a **Kopírovať odkaz**. Tlačidlo 📤 je aj priamo v záverečnej karte.
- Zdieľaný odkaz je výzva, napr. `https://misia9.sk/?vyzva=23-277-easy-2026-10-20` – kamarát uvidí
  „Kamarát dnes získal 23 / 27 za 4:37. Prekonáš to?“ a nastaví sa mu rovnaká úroveň. Mesto sa do odkazu ani obrázka nedáva.
- Facebook pri zdieľaní zobrazí náhľad stránky (og-image.png) – obrázok s výsledkom sa na FB dá pridať cez tlačidlo Zdieľať… na mobile.

## Anonymita a súkromie (dôležité)
Projekt je navrhnutý tak, aby **nespracúval osobné údaje**. Preto môže prevádzkovateľ ostať v pozadí:
- **Prezývky generuje hra** („Bystrá Sýkorka 42“, kocka 🎲 prehodí). Hráč nič nepíše, server prijme len prezývku zo zoznamu
  (`functions/_shared/pseudonym.js` – rovnaké zoznamy sú v `index.html`, pri zmene uprav oba).
- **Kraj** je nepovinný výber z 8 krajov, nie voľný text.
- Výsledky sa mažú po 180 dňoch, denné rebríčky po 45 dňoch. Bez cookies, analytiky a reklamy.
- **Nič z cudzích serverov:** písma a štýly sú v `fonts/` a `styles.css`; hlavička Content-Security-Policy v `_headers` to vynucuje.
- Stránka **/sukromie** to všetko vysvetľuje a uvádza kontakt **kontakt@misia9.sk**.

### Čo treba urobiť ty (mimo kódu)
1. **Kontaktný e-mail bez mena:** Cloudflare → doména misia9.sk → **Email → Email Routing** → vytvor adresu `kontakt@misia9.sk`
   s preposielaním na tvoj e-mail (zadarmo). Odpovedaj z adresy bez celého mena, napr. „Tím Sýkorkinej misie“.
2. **GitHub repozitár nastav ako súkromný** (Settings → General → Change visibility → Private). Cloudflare Pages funguje aj so súkromným.
3. **WHOIS domény:** pri fyzických osobách SK-NIC osobné údaje verejne nezobrazuje – netreba nič robiť.
4. Na stránke neodkazuj na svoje osobné weby a profily.
5. **Doučovatelia sú zapnutí a ZADARMO.** Keďže za umiestnenie nič neplatia, web zostáva nekomerčný.
   IČO sa po schválení vymaže, e-mail sa vymaže spolu s prihláškou (popísané na /sukromie).
   Vypnutie: Cloudflare → Settings → Variables and Secrets → `TUTORS_ENABLED` = `0`.
   **Ak by si raz chcela za umiestnenie peniaze**, web sa stane komerčným – vtedy musí byť uvedený prevádzkovateľ
   (meno/firma, IČO, kontakt) a príjem treba zdaniť (živnosť alebo občianske združenie).

### Úprava vzhľadu (styles.css)
Štýly sú vopred skompilované z Tailwind tried. Ak doplníš do HTML **novú** Tailwind triedu, treba znova vygenerovať `styles.css`
(napíš mi, alebo v hlavnom priečinku projektu: `npx tailwindcss@3 -c build/tailwind.config.js -i build/site-in.css -o styles.css --minify`).
