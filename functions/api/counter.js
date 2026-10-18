// Cloudflare Pages Function
// Dostupné na: /api/counter
//
// Vyžaduje KV namespace naviazaný v Cloudflare Pages Settings -> Functions -> KV namespace bindings
// Názov premennej (binding): COUNTER

const KEY = "visits";

export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const readOnly = url.searchParams.get("readOnly") === "true";

  try {
    let count;

    if (readOnly) {
      const stored = await env.COUNTER.get(KEY);
      count = stored ? parseInt(stored, 10) : 0;
    } else {
      const stored = await env.COUNTER.get(KEY);
      count = (stored ? parseInt(stored, 10) : 0) + 1;
      await env.COUNTER.put(KEY, count.toString());
    }

    return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chyba počítadla:", error);
    return Response.json({ error: "Nepodarilo sa načítať počítadlo" }, { status: 500 });
  }
}
