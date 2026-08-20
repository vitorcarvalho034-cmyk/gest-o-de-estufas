import moment from "moment";
import { VARIEDADES } from "@/lib/variedades";
import { normalizarVariedade, isVariedadeFixa, isVariedadeGirassol } from "@/lib/coresVariedades";
import { getHastesColheita } from "@/lib/colheitaHastes";

export const AREA_M2_POR_CANTEIRO = 27.24;

const VARIEDADES_CRISANTEMO = new Set(
  VARIEDADES.map((variedade) => normalizarVariedade(variedade).toUpperCase())
);

export const DIAS_SEMANA = [
  { numero: 1, nome: "Segunda-feira" },
  { numero: 2, nome: "Terça-feira" },
  { numero: 3, nome: "Quarta-feira" },
  { numero: 4, nome: "Quinta-feira" },
  { numero: 5, nome: "Sexta-feira" },
  { numero: 6, nome: "Sábado" },
  { numero: 7, nome: "Domingo" },
];

// Mantido localmente para não depender do idioma configurado no navegador.
export const MESES_PT_BR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

export function nomeCanonicamenteNormalizado(variedade) {
  return normalizarVariedade(String(variedade || "")).trim();
}

export function isCrisantemo(variedade) {
  const nome = nomeCanonicamenteNormalizado(variedade);
  if (!nome || isVariedadeFixa(nome) || isVariedadeGirassol(nome)) return false;
  return VARIEDADES_CRISANTEMO.has(nome.toUpperCase());
}

function chaveCanteiro(registro) {
  const { estufa, lado, vao, canteiro } = registro || {};
  if (!estufa || !lado || !vao || !canteiro) return null;
  return `E${estufa}-${lado}-V${vao}-C${canteiro}`;
}

function pertenceAoFiltro(registro, filtros, campoData) {
  const data = registro?.[campoData];
  if (!data || !moment(data, "YYYY-MM-DD", true).isValid()) return false;
  const dataMoment = moment(data, "YYYY-MM-DD");

  if (filtros.ano && dataMoment.year() !== Number(filtros.ano)) return false;
  if (filtros.semana !== "all" && dataMoment.isoWeek() !== Number(filtros.semana)) return false;
  if (filtros.estufa !== "all" && Number(registro.estufa) !== Number(filtros.estufa)) return false;

  if (filtros.variedade !== "all" && nomeCanonicamenteNormalizado(registro.variedade) !== filtros.variedade) return false;
  return true;
}

function novaLinhaVariedade(nome) {
  return {
    variedade: nome,
    hastes_colhidas: 0,
    cestos: 0,
    hastes_descartadas: 0,
    canteiros: new Set(),
  };
}

function consolidarVariedades(colheitas, descartes) {
  const mapa = new Map();
  const getLinha = (variedade) => {
    const nome = nomeCanonicamenteNormalizado(variedade);
    if (!mapa.has(nome)) mapa.set(nome, novaLinhaVariedade(nome));
    return mapa.get(nome);
  };

  colheitas.forEach((colheita) => {
    const linha = getLinha(colheita.variedade);
    linha.hastes_colhidas += getHastesColheita(colheita);
    linha.cestos += numeroSeguro(colheita.cestos);
    const canteiro = chaveCanteiro(colheita);
    if (canteiro) linha.canteiros.add(canteiro);
  });

  descartes.forEach((descarte) => {
    const linha = getLinha(descarte.variedade);
    linha.hastes_descartadas += numeroSeguro(descarte.quantidade);
    const canteiro = chaveCanteiro(descarte);
    if (canteiro) linha.canteiros.add(canteiro);
  });

  return [...mapa.values()]
    .map((linha) => {
      const area_m2 = linha.canteiros.size * AREA_M2_POR_CANTEIRO;
      const total_processado = linha.hastes_colhidas + linha.hastes_descartadas;
      return {
        variedade: linha.variedade,
        hastes_colhidas: linha.hastes_colhidas,
        cestos: linha.cestos,
        hastes_descartadas: linha.hastes_descartadas,
        canteiros: linha.canteiros.size,
        area_m2: Number(area_m2.toFixed(2)),
        produtividade_m2: area_m2 > 0 ? Number((linha.hastes_colhidas / area_m2).toFixed(2)) : 0,
        aproveitamento_pct: total_processado > 0 ? Number(((linha.hastes_colhidas / total_processado) * 100).toFixed(2)) : 0,
        descarte_pct: total_processado > 0 ? Number(((linha.hastes_descartadas / total_processado) * 100).toFixed(2)) : 0,
      };
    })
    .sort((a, b) => a.variedade.localeCompare(b.variedade, "pt-BR", { sensitivity: "base" }));
}

function consolidarPorMes(colheitas, descartes, variedadeSelecionada) {
  const mapa = new Map();
  for (let mes = 1; mes <= 12; mes += 1) {
    const chave = String(mes).padStart(2, "0");
    mapa.set(chave, {
      mes_numero: mes,
      mes: MESES_PT_BR[mes - 1],
      hastes_colhidas: 0,
      hastes_descartadas: 0,
      cestos: 0,
      canteiros: new Set(),
    });
  }

  colheitas.forEach((colheita) => {
    if (variedadeSelecionada !== "all" && nomeCanonicamenteNormalizado(colheita.variedade) !== variedadeSelecionada) return;
    const chave = moment(colheita.data_colheita, "YYYY-MM-DD").format("MM");
    const linha = mapa.get(chave);
    linha.hastes_colhidas += getHastesColheita(colheita);
    linha.cestos += numeroSeguro(colheita.cestos);
    const canteiro = chaveCanteiro(colheita);
    if (canteiro) linha.canteiros.add(canteiro);
  });

  descartes.forEach((descarte) => {
    if (variedadeSelecionada !== "all" && nomeCanonicamenteNormalizado(descarte.variedade) !== variedadeSelecionada) return;
    const chave = moment(descarte.data_descarte, "YYYY-MM-DD").format("MM");
    const linha = mapa.get(chave);
    linha.hastes_descartadas += numeroSeguro(descarte.quantidade);
    const canteiro = chaveCanteiro(descarte);
    if (canteiro) linha.canteiros.add(canteiro);
  });

  const totalAnual = [...mapa.values()].reduce((soma, linha) => soma + linha.hastes_colhidas, 0);
  return [...mapa.values()].map((linha) => {
    const area_m2 = linha.canteiros.size * AREA_M2_POR_CANTEIRO;
    const processado = linha.hastes_colhidas + linha.hastes_descartadas;
    return {
      mes_numero: linha.mes_numero,
      mes: linha.mes,
      hastes_colhidas: linha.hastes_colhidas,
      hastes_descartadas: linha.hastes_descartadas,
      cestos: linha.cestos,
      canteiros: linha.canteiros.size,
      area_m2: Number(area_m2.toFixed(2)),
      produtividade_m2: area_m2 > 0 ? Number((linha.hastes_colhidas / area_m2).toFixed(2)) : 0,
      aproveitamento_pct: processado > 0 ? Number(((linha.hastes_colhidas / processado) * 100).toFixed(2)) : 0,
      participacao_anual_pct: totalAnual > 0 ? Number(((linha.hastes_colhidas / totalAnual) * 100).toFixed(2)) : 0,
    };
  });
}

function consolidarDiasSemana(colheitas) {
  const mapa = new Map(DIAS_SEMANA.map((dia) => [dia.numero, { ...dia, hastes_colhidas: 0, cestos: 0, registros: 0 }]));
  colheitas.forEach((colheita) => {
    const dia = moment(colheita.data_colheita, "YYYY-MM-DD").isoWeekday();
    const linha = mapa.get(dia);
    linha.hastes_colhidas += getHastesColheita(colheita);
    linha.cestos += numeroSeguro(colheita.cestos);
    linha.registros += 1;
  });
  return [...mapa.values()];
}

function registrosNaoClassificados(registros, campoData, filtros) {
  return registros
    .filter((registro) => pertenceAoFiltro(registro, filtros, campoData))
    .filter((registro) => {
      const variedade = nomeCanonicamenteNormalizado(registro.variedade);
      return variedade && !isCrisantemo(variedade) && !isVariedadeFixa(variedade) && !isVariedadeGirassol(variedade);
    });
}

export function construirAnaliseColheita(colheitas = [], descartes = [], filtros) {
  const colheitasFiltradas = colheitas
    .filter((registro) => pertenceAoFiltro(registro, filtros, "data_colheita"))
    .filter((registro) => isCrisantemo(registro.variedade));

  const descartesFiltrados = descartes
    .filter((registro) => pertenceAoFiltro(registro, filtros, "data_descarte"))
    .filter((registro) => isCrisantemo(registro.variedade));

  const porVariedade = consolidarVariedades(colheitasFiltradas, descartesFiltrados);
  const porMes = consolidarPorMes(colheitasFiltradas, descartesFiltrados, filtros.variedade);
  const porDiaSemana = consolidarDiasSemana(colheitasFiltradas);

  const hastes_colhidas = colheitasFiltradas.reduce((soma, registro) => soma + getHastesColheita(registro), 0);
  const hastes_descartadas = descartesFiltrados.reduce((soma, registro) => soma + numeroSeguro(registro.quantidade), 0);
  const cestos = colheitasFiltradas.reduce((soma, registro) => soma + numeroSeguro(registro.cestos), 0);
  const area_m2 = new Set(colheitasFiltradas.map(chaveCanteiro).filter(Boolean)).size * AREA_M2_POR_CANTEIRO;
  const total_processado = hastes_colhidas + hastes_descartadas;

  const colheitasNaoClassificadas = registrosNaoClassificados(colheitas, "data_colheita", filtros);
  const descartesNaoClassificados = registrosNaoClassificados(descartes, "data_descarte", filtros);

  return {
    filtros,
    resumo: {
      hastes_colhidas,
      hastes_descartadas,
      cestos,
      area_m2: Number(area_m2.toFixed(2)),
      produtividade_m2: area_m2 > 0 ? Number((hastes_colhidas / area_m2).toFixed(2)) : 0,
      aproveitamento_pct: total_processado > 0 ? Number(((hastes_colhidas / total_processado) * 100).toFixed(2)) : 0,
      descarte_pct: total_processado > 0 ? Number(((hastes_descartadas / total_processado) * 100).toFixed(2)) : 0,
      registros_colheita: colheitasFiltradas.length,
      registros_descarte: descartesFiltrados.length,
    },
    porVariedade,
    porMes,
    porDiaSemana,
    bases: {
      colheitas: colheitasFiltradas,
      descartes: descartesFiltrados,
    },
    validacoes: {
      colheitas_nao_classificadas: colheitasNaoClassificadas,
      descartes_nao_classificados: descartesNaoClassificados,
    },
  };
}

export function formatarNumero(numero, casas = 0) {
  return Number(numero || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatarPercentual(numero) {
  return `${formatarNumero(numero, 1)}%`;
}
