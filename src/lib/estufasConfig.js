// Número de vãos (canteiros) por lado de cada estufa
// Total por estufa = vaos_por_lado * 2 (lado A + lado B)
export const ESTUFA_VAOS = {
  1: 16, // 32 vãos total → 16 por lado
  2: 15, // 30 vãos total → 15 por lado
  3: 13, // 26 vãos total → 13 por lado
  4: 16, // 32 vãos total → 16 por lado
};

export const TOTAL_VAOS = {
  1: 32,
  2: 30,
  3: 26,
  4: 32,
};

export function getVaos(estufa) {
  return ESTUFA_VAOS[estufa] || 4;
}

export function getVaosArray(estufa) {
  const count = getVaos(estufa);
  return Array.from({ length: count }, (_, i) => i + 1);
}