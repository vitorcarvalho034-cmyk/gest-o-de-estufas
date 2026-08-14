// Conversão única de cestos em hastes para evitar registros e relatórios zerados.
// Mantém compatibilidade com a coluna legada "pressas" do Supabase.

export const HASTES_POR_CESTO = {
  "Barracão": 50,
  "Mercado": 60,
  "Oferta 60": 60,
  "Oferta 80": 80,
};

const NOMES_STATICE = ["sinzii", "tasmania"];
const NOMES_LIMONIUM = ["limonium", "klara", "piuma", "shooting star", "oshi", "supreme"];

export function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

export function isStatice(variedade = "") {
  const nome = String(variedade).toLowerCase();
  return NOMES_STATICE.some(item => nome.includes(item));
}

export function isLimonium(variedade = "") {
  const nome = String(variedade).toLowerCase();
  return NOMES_LIMONIUM.some(item => nome.includes(item));
}

export function isGirassol(variedade = "") {
  return String(variedade).toLowerCase().includes("girassol");
}

export function getHastesPorCesto(colheita = {}) {
  // Statice e Limonium são lançados como 40 hastes por cesto.
  if (isStatice(colheita.variedade) || isLimonium(colheita.variedade)) return 40;
  // Girassol é lançado como 50 hastes por cesto no Barracão.
  if (isGirassol(colheita.variedade)) return 50;
  return HASTES_POR_CESTO[colheita.destino] || 0;
}

/**
 * Retorna hastes válidas inclusive em registros antigos que foram salvos
 * somente com cestos e ficaram com hastes/pressas zeradas.
 */
export function getHastesColheita(colheita = {}) {
  const hastesSalvas = Math.max(numeroSeguro(colheita.hastes), numeroSeguro(colheita.pressas));
  if (hastesSalvas > 0) return hastesSalvas;

  const cestos = numeroSeguro(colheita.cestos);
  const hastesAvulsas = numeroSeguro(colheita.hastes_avulsas);
  return (cestos * getHastesPorCesto(colheita)) + hastesAvulsas;
}

/**
 * Garante que novos inserts e updates gravem as duas colunas durante a
 * transição pressas → hastes, evitando totais zerados e erros de schema.
 */
export function normalizarColheitaParaSalvar(colheita = {}) {
  const hastes = getHastesColheita(colheita);
  return {
    ...colheita,
    hastes,
    pressas: hastes,
  };
}

export function normalizarColheitaParaLeitura(colheita = {}) {
  return {
    ...colheita,
    hastes: getHastesColheita(colheita),
  };
}

export { NOMES_STATICE, NOMES_LIMONIUM };
