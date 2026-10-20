// Anonymné prezývky a kraje – rovnaké zoznamy sú aj v hre (index.html, PSEUDO). Pri zmene uprav oba.
// Hráč si prezývku nepíše, hra mu ju vygeneruje (napr. „Bystrá Sýkorka 42“). Vďaka tomu sa do
// rebríčka nedostane skutočné meno ani nevhodné slovo a výsledky nie sú osobné údaje.

export const ADJ = [
  ["Rýchly", "Rýchla"], ["Múdry", "Múdra"], ["Odvážny", "Odvážna"], ["Veselý", "Veselá"], ["Bystrý", "Bystrá"],
  ["Šikovný", "Šikovná"], ["Usilovný", "Usilovná"], ["Zvedavý", "Zvedavá"], ["Statočný", "Statočná"], ["Hravý", "Hravá"],
  ["Pozorný", "Pozorná"], ["Zlatý", "Zlatá"], ["Hviezdny", "Hviezdna"], ["Bleskový", "Blesková"], ["Slnečný", "Slnečná"],
  ["Usmiaty", "Usmiata"], ["Tichý", "Tichá"], ["Pravopisný", "Pravopisná"]
];
export const NOUN_M = ["Ježko", "Zajko", "Vrabček", "Bobor", "Medvedík", "Kamzík", "Rys", "Delfín", "Mravček", "Jelenček", "Sokol", "Tučniak", "Psík", "Lev", "Orol"];
export const NOUN_F = ["Sýkorka", "Líška", "Veverička", "Sova", "Lienka", "Včielka", "Žabka", "Rybka", "Myška", "Mačička", "Lastovička", "Srnka", "Korytnačka", "Panda", "Žirafa"];
export const KRAJE = ["Bratislavský kraj", "Trnavský kraj", "Trenčiansky kraj", "Nitriansky kraj", "Žilinský kraj", "Banskobystrický kraj", "Prešovský kraj", "Košický kraj"];

export function isPseudonym(name) {
  const m = /^(\S+) (\S+) ([1-9]\d?)$/.exec(String(name || ""));
  if (!m) return false;
  const [, adj, noun] = m;
  if (NOUN_M.includes(noun)) return ADJ.some(a => a[0] === adj);
  if (NOUN_F.includes(noun)) return ADJ.some(a => a[1] === adj);
  return false;
}
export const isKraj = k => k === "" || KRAJE.includes(k);
