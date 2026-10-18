# Misia9.sk – nasadenie na Cloudflare Pages

Pôvodný ZIP bol postavený na **Netlify Functions + Netlify DB (Postgres)**, čo Cloudflare Pages
nevie priamo použiť (odtiaľ aj chyba "Asset too large" – balík obsahoval Netlify/Node binárky).

Táto verzia je prerobená na čistý statický web + **Cloudflare Pages Function**, ktorá počítadlo
ukladá do **Cloudflare KV** (žiadna databáza netreba).

## Štruktúra

```
index.html              <- stránka (bez zmeny v hre, len upravené API volanie ostalo rovnaké: /api/counter)
functions/api/counter.ts <- Pages Function obsluhujúca GET /api/counter
```

## Postup nasadenia

1. **Vytvor KV namespace**
   - Cloudflare Dashboard → Workers & Pages → KV → "Create a namespace"
   - Názov napr. `misia9-counter`

2. **Nahraj tento priečinok ako Pages projekt**
   - Buď cez Git repozitár, alebo cez "Upload assets" / Wrangler:
     ```
     npx wrangler pages deploy ./cf --project-name=misia9
     ```
   - Build command: žiadny (statický obsah)
   - Output directory: `.` (koreň, kde je index.html)

3. **Priprav KV binding k projektu**
   - Pages projekt → Settings → Functions → "KV namespace bindings"
   - Variable name: `COUNTER`
   - KV namespace: vyber `misia9-counter`
   - Ulož a znovu nasaď (redeploy), aby sa binding prejavil.

4. Hotovo – `/api/counter` bude fungovať a počítadlo na stránke sa bude zobrazovať a zvyšovať.

## Poznámka
Toto riešenie nepoužíva žiadnu databázu ani Node závislosti, takže sa vyhneš buildovacím chybám
z pôvodného Netlify projektu.
