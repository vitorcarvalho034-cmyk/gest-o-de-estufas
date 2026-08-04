// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DE VARIEDADES
// Mapeia aliases / abreviações / erros de digitação → nome canônico oficial
// Usado para eliminar duplicidade nos relatórios de produtividade
// ─────────────────────────────────────────────────────────────────────────────
export const ALIAS_VARIEDADES = {
  // ── Calimero (abreviações CAL.) ───────────────────────────────────────────
  "cal.pink":              "Calimero Pink",
  "cal. pink":             "Calimero Pink",
  "calimero pink":         "Calimero Pink",
  "cal.snow":              "Calimero Snow",
  "cal. snow":             "Calimero Snow",
  "calimero snow":         "Calimero Snow",
  "cal.sunny":             "Calimero Sunny",
  "cal. sunny":            "Calimero Sunny",
  "calimero sunny":        "Calimero Sunny",
  "cal.orange":            "Calimero Orange",
  "cal. orange":           "Calimero Orange",
  "calimero orange":       "Calimero Orange",

  // ── Anastasia Fuego Dark (variações Desb.) ────────────────────────────────
  "desb. anastasia fuego dark":  "Anastasia Fuego Dark",
  "desb.anastasia fuego dark":   "Anastasia Fuego Dark",
  "desb. fuego dark":            "Anastasia Fuego Dark",
  "desb.fuego dark":             "Anastasia Fuego Dark",
  "desb.dark fuego":             "Anastasia Fuego Dark",
  "desb. dark fuego":            "Anastasia Fuego Dark",
  "anastasia fuego dark":        "Anastasia Fuego Dark",
  "fuego dark":                  "Anastasia Fuego Dark",

  // ── Anastasia Cipria ──────────────────────────────────────────────────────
  "desb. cipria":          "Anastasia Cipria",
  "desb.cipria":           "Anastasia Cipria",
  "cipria":                "Anastasia Cipria",
  "cipria sem desbotonar": "Anastasia Cipria",
  "anastasia cipria":      "Anastasia Cipria",
  "anastasia  cipria":     "Anastasia Cipria",

  // ── Anastasia Herrera ─────────────────────────────────────────────────────
  "desb. herrera":         "Anastasia Herrera",
  "desb.herrera":          "Anastasia Herrera",
  "anastasia herrera":     "Anastasia Herrera",

  // ── Anastasia Magnum ──────────────────────────────────────────────────────
  "desb. magnum":          "Anastasia Magnum",
  "desb.magnum":           "Anastasia Magnum",
  "anastasia magnum":      "Anastasia Magnum",

  // ── Anastasia Lotso ───────────────────────────────────────────────────────
  "desb. lotso":           "Anastasia Lotso",
  "desb.lotso":            "Anastasia Lotso",
  "anastasia lotso":       "Anastasia Lotso",

  // ── Anastasia Boda ────────────────────────────────────────────────────────
  "desb. boda":            "Anastasia Boda",
  "desb.boda":             "Anastasia Boda",
  "anastasia boda":        "Anastasia Boda",

  // ── Anastasia Fiebre ──────────────────────────────────────────────────────
  "desb. fiebre":          "Anastasia Fiebre",
  "desb.fiebre":           "Anastasia Fiebre",
  "anastasia fiebre":      "Anastasia Fiebre",

  // ── Anastasia Chispa ──────────────────────────────────────────────────────
  "desb. chispa":          "Anastasia Chispa",
  "desb.chispa":           "Anastasia Chispa",
  "anastasia chispa":      "Anastasia Chispa",

  // ── Anastasia Sunny ───────────────────────────────────────────────────────
  "desb. anastasia sunny": "Anastasia Sunny",
  "desb.anastasia sunny":  "Anastasia Sunny",
  "anastasia sunny":       "Anastasia Sunny",

  // ── Anastasia Dark Green ──────────────────────────────────────────────────
  "desb. anastasia dark green":  "Anastasia Green Dark",
  "des. anastasia dark green":   "Anastasia Green Dark",
  "anastasia dark green":        "Anastasia Green Dark",
  "anastasia green dark":        "Anastasia Green Dark",
  "anastasia green dark":        "Anastasia Green Dark",

  // ── Sorbet / Sobert Vanilla (erro de digitação) ───────────────────────────
  "sorbet vanilla":        "Sorbet Vanilla",
  "sobert vanilla":        "Sorbet Vanilla",
  "sorbet vanila":         "Sorbet Vanilla",
  "sobert vanila":         "Sorbet Vanilla",

  // ── Abbey variações ───────────────────────────────────────────────────────
  "abbey":                 "Abbey",
  "abbey flame":           "Abbey Flame",
  "abbey purple":          "Abbey Purple",
  "abbey yellow":          "Abbey Yellow",

  // ── Vespa variações ───────────────────────────────────────────────────────
  "vespa pink":            "Vespa Pink",
  "vespa salmon":          "Vespa Salmon",
  "vespa splendid":        "Vespa Splendid",
  "vespa white":           "Vespa White",

  // ── Fireball ──────────────────────────────────────────────────────────────
  "fireball dark":         "Fireball Dark",
  "fireball":              "Fireball Dark",
};

/**
 * Normaliza o nome de uma variedade para o nome canônico oficial.
 * Elimina duplicidade nos relatórios de produtividade.
 * Ex: "CAL.PINK" → "Calimero Pink", "Desb. Cipria" → "Anastasia Cipria"
 */
export function normalizarVariedade(variedade) {
  if (!variedade) return variedade;
  const key = variedade.toLowerCase().trim().replace(/\s+/g, " ");
  if (ALIAS_VARIEDADES[key]) return ALIAS_VARIEDADES[key];
  return variedade.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO DE COR — nome canônico → cor da flor
// ─────────────────────────────────────────────────────────────────────────────
export const CORES_VARIEDADES = {
  // ── VERMELHO ──────────────────────────────────────────────────────────────
  "Army":           "Vermelho",
  "Malteser":       "Vermelho",
  "Urban":          "Vermelho",
  "Fenix":          "Vermelho",
  "Kalua":          "Vermelho",
  "Moretti":        "Vermelho",
  "Sainz":          "Vermelho",
  "Zarco":          "Vermelho",
  "Dante":          "Vermelho",

  // ── AMARELO ───────────────────────────────────────────────────────────────
  "Brasiliana":     "Amarelo",
  "Cleo":           "Amarelo",
  "Anastasia Sunny":"Amarelo",
  "Anastasia Fiebre":"Amarelo",
  "Carioca":        "Amarelo",
  "Dink":           "Amarelo",
  "Baldr":          "Amarelo",
  "Abbey Yellow":   "Amarelo",
  "Calimero Sunny": "Amarelo",
  "Paintball Sunny":"Amarelo",
  "Zinta":          "Amarelo",
  "Zembla Sunny":   "Amarelo",
  "Cantaloupe":     "Amarelo",

  // ── VERDE ─────────────────────────────────────────────────────────────────
  "Feeling Green Dark":  "Verde",
  "Jamaica":             "Verde",
  "Anastasia Green Dark":"Verde",
  "Felicidade Jade":     "Verde",
  "Lorenzo":             "Verde",

  // ── LARANJA ───────────────────────────────────────────────────────────────
  "Harley":              "Laranja",
  "Lexy":                "Laranja",
  "Lionking":            "Laranja",
  "Anastasia Fuego Dark":"Laranja",
  "Anastasia Chispa":    "Laranja",
  "Abbey Flame":         "Laranja",
  "Appetit":             "Laranja",
  "Fireball Dark":       "Laranja",
  "Varese":              "Laranja",
  "Calimero Orange":     "Laranja",

  // ── ROSA ──────────────────────────────────────────────────────────────────
  "Marielle":        "Rosa",
  "Anastasia Boda":  "Rosa",
  "Anastasia Cipria":"Rosa",
  "Abbey":           "Rosa",
  "Abbey Purple":    "Rosa",
  "Bambina":         "Rosa",
  "Carey":           "Rosa",
  "Orizaba":         "Rosa",
  "Sakura":          "Rosa",
  "Vespa Pink":      "Rosa",
  "Vespa Salmon":    "Rosa",
  "Calimero Pink":   "Rosa",

  // ── ROXO ──────────────────────────────────────────────────────────────────
  "Quinty":          "Roxo",
  "Anastasia Lotso": "Roxo",
  "Procida":         "Roxo",
  "Vespa Splendid":  "Roxo",
  "Ibra":            "Roxo",
  "Dante Purple":    "Roxo",

  // ── BRANCO ────────────────────────────────────────────────────────────────
  "Yukiko":          "Branco",
  "Anastasia Herrera":"Branco",
  "Anastasia Magnum":"Branco",
  "Avenza":          "Branco",
  "Spartak":         "Branco",
  "Vespa White":     "Branco",
  "Calimero Snow":   "Branco",
  "Maverick White":  "Branco",
  "Topspin":         "Branco",
  "Alma":            "Branco",

  // ── CREME ─────────────────────────────────────────────────────────────────
  "Eirini":          "Creme",
  "Sorbet Vanilla":  "Creme",
};

// Paleta de cores visuais para cada cor de flor
export const PALETA_CORES = {
  "Vermelho":  { bg: "#ef4444", text: "#fff", light: "#fee2e2" },
  "Amarelo":   { bg: "#eab308", text: "#fff", light: "#fef9c3" },
  "Verde":     { bg: "#22c55e", text: "#fff", light: "#dcfce7" },
  "Laranja":   { bg: "#f97316", text: "#fff", light: "#ffedd5" },
  "Rosa":      { bg: "#ec4899", text: "#fff", light: "#fce7f3" },
  "Roxo":      { bg: "#a855f7", text: "#fff", light: "#f3e8ff" },
  "Branco":    { bg: "#e5e7eb", text: "#374151", light: "#f9fafb" },
  "Creme":     { bg: "#d4b896", text: "#fff", light: "#fdf6ec" },
  "Indefinida":{ bg: "#9ca3af", text: "#fff", light: "#f3f4f6" },
};

// Variedades de flor de corte fixa (Statice e Limonium) — destino fixo Barracão, 40 hastes/cesto
export const VARIEDADES_FIXAS = [
  "Sinzii White", "Sinzii Lilac", "Sinzii Lavanderish", "Sinzii Blueish",
  "Tasmania Rose",
  "Klara Skylight", "Klara Silvery Pink", "Piuma Dark Blue",
  "Shooting Star", "Oshi Pink", "Supreme Whitelight",
];

// Variedades de Girassol — destino fixo Barracão, 50 hastes/cesto
export const VARIEDADES_GIRASSOL = [
  "Girassol", "Sunflower", "Helianthus",
];

// Verifica se uma variedade é de flor fixa (Statice/Limonium)
export function isVariedadeFixa(variedade) {
  if (!variedade) return false;
  const lower = normalizarVariedade(variedade).toLowerCase().trim();
  return VARIEDADES_FIXAS.some(v => {
    const vl = v.toLowerCase().trim();
    return lower === vl || lower.includes(vl) || vl.includes(lower);
  });
}

// Verifica se uma variedade é Girassol
export function isVariedadeGirassol(variedade) {
  if (!variedade) return false;
  const lower = normalizarVariedade(variedade).toLowerCase().trim();
  return VARIEDADES_GIRASSOL.some(v => {
    const vl = v.toLowerCase().trim();
    return lower === vl || lower.includes(vl) || vl.includes(lower);
  });
}

// Retorna a cor de uma variedade (ou "Indefinida")
// Normaliza o nome antes de buscar para garantir correspondência
export function getCorVariedade(variedade) {
  if (!variedade) return "Indefinida";
  const nome = normalizarVariedade(variedade);
  // 1. Busca exata no nome normalizado
  if (CORES_VARIEDADES[nome]) return CORES_VARIEDADES[nome];
  // 2. Busca case-insensitive
  const lower = nome.toLowerCase().trim().replace(/\s+/g, " ");
  const found = Object.entries(CORES_VARIEDADES).find(
    ([k]) => k.toLowerCase().trim().replace(/\s+/g, " ") === lower
  );
  if (found) return found[1];
  // 3. Busca parcial
  for (const [k, v] of Object.entries(CORES_VARIEDADES)) {
    const kl = k.toLowerCase().trim().replace(/\s+/g, " ");
    if (lower.includes(kl) || kl.includes(lower)) return v;
  }
  return "Indefinida";
}

// Agrupa um array de { variedade, quantidade } por cor
export function agruparPorCor(itens) {
  const mapa = {};
  for (const item of itens) {
    const cor = getCorVariedade(item.variedade);
    if (!mapa[cor]) mapa[cor] = 0;
    mapa[cor] += Number(item.quantidade) || 0;
  }
  return Object.entries(mapa)
    .map(([cor, total]) => ({ cor, total }))
    .sort((a, b) => {
      if (a.cor === "Indefinida") return 1;
      if (b.cor === "Indefinida") return -1;
      return b.total - a.total;
    });
}
