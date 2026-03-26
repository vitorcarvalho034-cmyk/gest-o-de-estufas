// Número de meio-vãos por lado de cada estufa
// Cada vão completo (fora a fora) = 2 meio-vãos (um por lado)
// Cada meio-vão tem 4 canteiros
export const ESTUFA_VAOS = {
  1: 32, // 32 vãos completos → 32 meio-vãos por lado
  2: 30, // 30 vãos completos → 30 meio-vãos por lado
  3: 26, // 26 vãos completos → 26 meio-vãos por lado
  4: 32, // 32 vãos completos → 32 meio-vãos por lado
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