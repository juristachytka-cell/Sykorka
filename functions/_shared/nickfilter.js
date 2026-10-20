// ===== Kontrola prezývky a mesta: vulgarizmy a nezmyselné slová =====
// (rovnaký kód je aj v hre v index.html – pri zmene uprav oba)
export const NickFilter = (() => {
  // korene vulgárnych a urážlivých slov (bez diakritiky, malými písmenami)
  const VULGAR = [
    "kurv", "kurev", "kurw", "kurva", "pica", "picu", "picus", "picov", "picin", "picka", "pizd", "kunda",
    "kokot", "kkt", "debil", "kreten", "idiot", "imbecil", "blbec", "chuj", "hovn", "hovad", "srac", "zasr", "posr",
    "jeb", "mrd", "zmrd", "sukat", "sukam", "suka", "prdel", "hajzl", "hajzel", "chcan", "buzerant", "buzna",
    "cigan", "negr", "nigg", "teplos", "teplous", "fuck", "shit", "bitch", "dick", "cock", "pussy", "cunt",
    "asshole", "porn", "sex", "penis", "vagin", "nazi", "hitler", "heil", "kkk", "fck", "fuk"
  ];
  // bežné slová a názvy, ktoré náhodou obsahujú niektorý z koreňov (Hviezdička, Opica, Smrdáky…)
  const ALLOW = ["hviezdick", "opic", "apic", "smrdak", "picass", "kokos", "sukn"];
  // typické skúšobné a „prázdne“ prezývky
  const TEST = new Set([
    "test", "testik", "tester", "testovanie", "testy", "skuska", "skusam", "skusobna", "skusobny", "skuskova",
    "asdf", "asd", "qwe", "qwer", "qwerty", "qwertz", "yxcv", "abc", "abcd", "abcde", "xxx", "xyz", "xy", "aaa",
    "nic", "nikto", "neviem", "anonym", "anonim", "nobody", "noname", "admin", "user", "hrac", "prezyvka", "meno",
    "nick", "nickname", "lol", "haha", "hihi", "hehe", "blabla", "bla", "dsa", "sdf", "ok", "okok", "null",
    "undefined", "nan", "jj", "kk", "hh", "aa", "ss", "dd", "ff", "gg"
  ]);
  const ROWS = ["qwertzuiop", "qwertyuiop", "asdfghjkl", "yxcvbnm", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i" };

  const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const deleet = s => s.replace(/[0134578@$!]/g, ch => LEET[ch]);
  const lettersOnly = s => s.replace(/[^a-z]/g, "");
  const collapse = s => s.replace(/(.)\1+/g, "$1");

  function check(raw, kind = "nick") {
    const p = plain(raw);
    const letters = lettersOnly(p);
    const leet = lettersOnly(deleet(p));
    // 1) vulgarizmy (aj s medzerami, bodkami, číslami namiesto písmen či zdvojenými písmenami)
    const unallow = v => ALLOW.reduce((acc, w) => acc.split(w).join("_"), v);
    for (const v of [letters, leet, collapse(letters), collapse(leet)].map(unallow)) {
      if (VULGAR.some(w => v.includes(w))) return { ok: false, reason: "vulgar" };
    }
    if (kind === "city" && !letters) return { ok: true };
    // 2) nezmyselné slová
    if (letters.length < 2) return { ok: false, reason: "nonsense" };
    const base = p.replace(/[^a-z0-9]/g, "").replace(/\d+$/, "");
    if (TEST.has(base) || TEST.has(letters) || TEST.has(collapse(letters))) return { ok: false, reason: "nonsense" };
    if (/(.)\1{3,}/.test(p.replace(/\s/g, ""))) return { ok: false, reason: "nonsense" };          // aaaa, 1111
    if (/^(.{1,3})\1{2,}$/.test(letters)) return { ok: false, reason: "nonsense" };                 // hahaha, ababab
    const compact = p.replace(/[^a-z0-9]/g, "");
    for (let i = 0; i + 4 <= compact.length; i++) {                                                  // asdf, qwer, 1234
      const g = compact.slice(i, i + 4), r = g.split("").reverse().join("");
      if (ROWS.some(row => row.includes(g) || row.includes(r))) return { ok: false, reason: "nonsense" };
    }
    for (const word of p.split(/[^a-z]+/).filter(Boolean)) {                                        // xkcdfg, bcdf
      if (/[^aeiouyrl]{5,}/.test(word)) return { ok: false, reason: "nonsense" };
      if (word.length >= 4 && !/[aeiouy]/.test(word.replace(/[rl]/g, "a"))) return { ok: false, reason: "nonsense" };
    }
    return { ok: true };
  }
  return { check };
})();
