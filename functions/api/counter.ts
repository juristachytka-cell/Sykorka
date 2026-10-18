// Cloudflare Pages Function
// Dostupné na: /api/counter
//
// Vyžaduje KV namespace naviazaný v Cloudflare Pages Settings -> Functions -> KV namespace bindings
// Názov premennej (binding): COUNTER

interface Env {
  COUNTER: KVNamespace;
}

const KEY = "visits";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const readOnly = url.searchParams.get("readOnly") === "true";

  try {
    let count: number;

    if (readOnly) {
      const stored = await env.COUNTER.get(KEY);
      count = stored ? parseInt(stored, 10) : 0;
    } else {
      // Jednoduchý atomický vzor nie je v KV dostupný, ale pre počítadlo návštev
      // postačuje toto read-modify-write (prípadné drobné straty pri súbehu neprekážajú)
      const stored = await env.COUNTER.get(KEY);
      count = (stored ? parseInt(stored, 10) : 0) + 1;
      await env.COUNTER.put(KEY, count.toString());
    }

    return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chyba počítadla:", error);
    return Response.json({ error: "Nepodarilo sa načítať počítadlo" }, { status: 500 });
  }
};
