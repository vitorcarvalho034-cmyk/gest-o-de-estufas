import moment from "moment";
import ExcelJS from "exceljs";
import { AREA_M2_POR_CANTEIRO, formatarNumero } from "@/lib/dadosColheita";

const VERDE = "0F5132";
const VERDE_CLARO = "DDF4E6";
const CINZA = "F3F5F4";
const VERMELHO_CLARO = "FCE7E7";
const BRANCO = "FFFFFF";

function estilizarCabecalho(linha) {
  linha.height = 24;
  linha.eachCell((celula) => {
    celula.font = { bold: true, color: { argb: BRANCO }, size: 10 };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    celula.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    celula.border = {
      top: { style: "thin", color: { argb: "9EB7A9" } },
      bottom: { style: "thin", color: { argb: "9EB7A9" } },
      left: { style: "thin", color: { argb: "9EB7A9" } },
      right: { style: "thin", color: { argb: "9EB7A9" } },
    };
  });
}

function colunaExcel(numero) {
  let resultado = "";
  let valor = numero;
  while (valor > 0) {
    const resto = (valor - 1) % 26;
    resultado = String.fromCharCode(65 + resto) + resultado;
    valor = Math.floor((valor - 1) / 26);
  }
  return resultado;
}

function criarCabecalhoRelatorio(planilha, titulo, subtitulo, colunas = 8) {
  const ultimaColuna = colunaExcel(colunas);
  planilha.mergeCells(`A1:${ultimaColuna}1`);
  planilha.getCell("A1").value = titulo;
  planilha.getCell("A1").font = { bold: true, size: 16, color: { argb: BRANCO } };
  planilha.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
  planilha.getCell("A1").alignment = { vertical: "middle" };
  planilha.getRow(1).height = 30;

  planilha.mergeCells(`A2:${ultimaColuna}2`);
  planilha.getCell("A2").value = subtitulo;
  planilha.getCell("A2").font = { italic: true, color: { argb: "4B5D53" }, size: 10 };
  planilha.getCell("A2").alignment = { vertical: "middle" };
  planilha.getRow(2).height = 20;
  planilha.getRow(3).height = 7;
}

function ajustarLarguras(planilha, larguras) {
  larguras.forEach((largura, index) => { planilha.getColumn(index + 1).width = largura; });
}

function aplicarLinhas(planilha, inicio, fim, colunasNumericas = []) {
  for (let i = inicio; i <= fim; i += 1) {
    const linha = planilha.getRow(i);
    linha.eachCell((celula) => {
      celula.alignment = { vertical: "middle", horizontal: "left" };
      celula.border = { bottom: { style: "hair", color: { argb: "D7E1DA" } } };
    });
    colunasNumericas.forEach((coluna) => {
      linha.getCell(coluna).alignment = { vertical: "middle", horizontal: "right" };
    });
    if ((i - inicio) % 2 === 0) {
      linha.eachCell((celula) => { celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } }; });
    }
  }
}

function adicionarRodape(planilha, linha, texto, colunas = 8) {
  planilha.mergeCells(`A${linha}:${colunaExcel(colunas)}${linha}`);
  const celula = planilha.getCell(`A${linha}`);
  celula.value = texto;
  celula.font = { italic: true, size: 9, color: { argb: "53635B" } };
  celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
  celula.alignment = { wrapText: true, vertical: "middle" };
  planilha.getRow(linha).height = 30;
}

function escreverTabela(planilha, cabecalhos, linhas, config = {}) {
  const linhaCabecalho = config.linhaCabecalho || 5;
  const linhaInicio = linhaCabecalho + 1;
  planilha.getRow(linhaCabecalho).values = cabecalhos;
  estilizarCabecalho(planilha.getRow(linhaCabecalho));
  linhas.forEach((linha) => planilha.addRow(linha));
  const linhaFim = linhaInicio + linhas.length - 1;
  if (linhas.length) aplicarLinhas(planilha, linhaInicio, linhaFim, config.colunasNumericas || []);
  planilha.autoFilter = { from: { row: linhaCabecalho, column: 1 }, to: { row: Math.max(linhaCabecalho, linhaFim), column: cabecalhos.length } };
  planilha.views = [{ state: "frozen", ySplit: linhaCabecalho }];
  return { linhaInicio, linhaFim };
}

function filtroTexto(filtros) {
  const semana = filtros.semana === "all" ? "todas as semanas" : `semana ${filtros.semana}`;
  const estufa = filtros.estufa === "all" ? "todas as estufas" : `Estufa ${filtros.estufa}`;
  const variedade = filtros.variedade === "all" ? "todas as variedades" : filtros.variedade;
  return `Ano ${filtros.ano} · ${semana} · ${estufa} · ${variedade}`;
}

export async function exportarDadosColheitaExcel(analise) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Flores da Terra";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = "Dados de Colheita — Crisântemos";
  workbook.properties.subject = "Produtividade, descarte e histórico de colheitas";

  const contexto = filtroTexto(analise.filtros);
  const geradoEm = moment().format("DD/MM/YYYY [às] HH:mm");

  const resumo = workbook.addWorksheet("Resumo Executivo", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(resumo, "Flores da Terra — Dados de Colheita", `${contexto} · Gerado em ${geradoEm}`, 3);
  resumo.getRow(5).values = ["Indicador", "Valor", "Critério de cálculo"];
  estilizarCabecalho(resumo.getRow(5));
  const r = analise.resumo;
  const indicadores = [
    ["Hastes colhidas", r.hastes_colhidas, "Soma das colheitas classificadas como crisântemo."],
    ["Hastes descartadas", r.hastes_descartadas, "Soma dos descartes em hastes."],
    ["Cestos", r.cestos, "Total de cestos lançados no período."],
    ["Área efetiva (m²)", r.area_m2, `Canteiros únicos colhidos × ${AREA_M2_POR_CANTEIRO.toLocaleString("pt-BR")} m².`],
    ["Produtividade (hastes/m²)", r.produtividade_m2, "Hastes colhidas ÷ área efetiva."],
    ["Aproveitamento (%)", r.aproveitamento_pct / 100, "Hastes colhidas ÷ (colhidas + descartadas)."],
    ["Taxa de descarte (%)", r.descarte_pct / 100, "Hastes descartadas ÷ (colhidas + descartadas)."],
    ["Registros de colheita", r.registros_colheita, "Quantidade de lançamentos considerados."],
    ["Registros de descarte", r.registros_descarte, "Quantidade de lançamentos considerados."],
  ];
  indicadores.forEach((linha) => resumo.addRow(linha));
  aplicarLinhas(resumo, 6, 5 + indicadores.length, [2]);
  resumo.getCell("B11").numFmt = "0.0%";
  resumo.getCell("B12").numFmt = "0.0%";
  ajustarLarguras(resumo, [34, 20, 66]);
  adicionarRodape(resumo, 16, "Escopo: somente variedades classificadas como crisântemos. Estatísticas de descarte são registradas em hastes e não são misturadas com mudas.", 3);

  const variedades = workbook.addWorksheet("Produtividade por Variedade", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(variedades, "Produtividade por Variedade", contexto, 9);
  const dadosVariedade = analise.porVariedade.map((linha) => [
    linha.variedade, linha.hastes_colhidas, linha.hastes_descartadas, linha.cestos, linha.canteiros,
    linha.area_m2, linha.produtividade_m2, linha.aproveitamento_pct / 100, linha.descarte_pct / 100,
  ]);
  escreverTabela(variedades,
    ["Variedade", "Hastes colhidas", "Hastes descartadas", "Cestos", "Canteiros", "Área (m²)", "Hastes/m²", "Aproveitamento", "Descarte"],
    dadosVariedade,
    { colunasNumericas: [2, 3, 4, 5, 6, 7, 8, 9] }
  );
  variedades.getColumn(8).numFmt = "0.0%";
  variedades.getColumn(9).numFmt = "0.0%";
  ajustarLarguras(variedades, [29, 18, 19, 12, 12, 14, 15, 16, 13]);

  const mensal = workbook.addWorksheet("Produtividade Mensal", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(mensal, "Produtividade por Mês", `${contexto} · Comparativo do ano selecionado`, 10);
  const dadosMensais = analise.porMes.map((linha) => [
    linha.mes_numero, linha.mes, linha.hastes_colhidas, linha.hastes_descartadas, linha.cestos,
    linha.canteiros, linha.area_m2, linha.produtividade_m2, linha.aproveitamento_pct / 100, linha.participacao_anual_pct / 100,
  ]);
  escreverTabela(mensal,
    ["Mês nº", "Mês", "Hastes colhidas", "Hastes descartadas", "Cestos", "Canteiros", "Área (m²)", "Hastes/m²", "Aproveitamento", "% do ano"],
    dadosMensais,
    { colunasNumericas: [1, 3, 4, 5, 6, 7, 8, 9, 10] }
  );
  mensal.getColumn(9).numFmt = "0.0%";
  mensal.getColumn(10).numFmt = "0.0%";
  ajustarLarguras(mensal, [10, 16, 18, 19, 12, 12, 14, 15, 16, 13]);

  const dias = workbook.addWorksheet("Colheita por Dia", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(dias, "Colheita por Dia da Semana", contexto, 5);
  const dadosDias = analise.porDiaSemana.map((linha) => [linha.numero, linha.nome, linha.hastes_colhidas, linha.cestos, linha.registros]);
  escreverTabela(dias,
    ["Dia nº", "Dia da semana", "Hastes colhidas", "Cestos", "Registros"],
    dadosDias,
    { colunasNumericas: [1, 3, 4, 5] }
  );
  ajustarLarguras(dias, [11, 24, 20, 14, 15]);

  const baseColheitas = workbook.addWorksheet("Base Colheitas", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(baseColheitas, "Base Auditável — Colheitas", `${contexto} · Dados que compõem os cálculos`, 12);
  const dadosBaseColheitas = analise.bases.colheitas.map((linha) => [
    linha.data_colheita, linha.semana || "", linha.estufa || "", linha.lado || "", linha.vao || "", linha.canteiro || "",
    linha.variedade || "", linha.destino || "", Number(linha.cestos || 0), Number(linha.hastes || 0), Number(linha.hastes_avulsas || 0), linha.id || "",
  ]);
  escreverTabela(baseColheitas,
    ["Data", "Semana", "Estufa", "Lado", "Vão", "Canteiro", "Variedade", "Destino", "Cestos", "Hastes", "Hastes avulsas", "ID"],
    dadosBaseColheitas,
    { colunasNumericas: [2, 3, 5, 6, 9, 10, 11] }
  );
  ajustarLarguras(baseColheitas, [14, 11, 11, 10, 9, 12, 28, 18, 12, 16, 18, 22]);

  const baseDescartes = workbook.addWorksheet("Base Descartes", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(baseDescartes, "Base Auditável — Descartes", `${contexto} · Unidade: hastes descartadas`, 11);
  const dadosBaseDescartes = analise.bases.descartes.map((linha) => [
    linha.data_descarte, linha.semana || "", linha.estufa || "", linha.lado || "", linha.vao || "", linha.canteiro || "",
    linha.variedade || "", linha.motivo || "", Number(linha.quantidade || 0), linha.observacao || "", linha.id || "",
  ]);
  escreverTabela(baseDescartes,
    ["Data", "Semana", "Estufa", "Lado", "Vão", "Canteiro", "Variedade", "Motivo", "Hastes descartadas", "Observação", "ID"],
    dadosBaseDescartes,
    { colunasNumericas: [2, 3, 5, 6, 9] }
  );
  ajustarLarguras(baseDescartes, [14, 11, 11, 10, 9, 12, 28, 18, 22, 36, 22]);

  const validacao = workbook.addWorksheet("Validações", { views: [{ showGridLines: false }] });
  criarCabecalhoRelatorio(validacao, "Validações de Qualidade", `${contexto} · Itens que ficaram fora do escopo de crisântemos`, 8);
  const avisos = [
    ...analise.validacoes.colheitas_nao_classificadas.map((linha) => ["Colheita não classificada", linha.data_colheita, linha.variedade || "Sem variedade", linha.estufa || "", linha.lado || "", linha.vao || "", linha.canteiro || "", linha.id || ""]),
    ...analise.validacoes.descartes_nao_classificados.map((linha) => ["Descarte não classificado", linha.data_descarte, linha.variedade || "Sem variedade", linha.estufa || "", linha.lado || "", linha.vao || "", linha.canteiro || "", linha.id || ""]),
  ];
  escreverTabela(validacao,
    ["Tipo", "Data", "Variedade", "Estufa", "Lado", "Vão", "Canteiro", "ID"],
    avisos,
    { colunasNumericas: [4, 6, 7] }
  );
  if (avisos.length) {
    for (let linha = 6; linha < 6 + avisos.length; linha += 1) {
      validacao.getRow(linha).eachCell((celula) => { celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERMELHO_CLARO } }; });
    }
  }
  ajustarLarguras(validacao, [28, 14, 28, 12, 10, 10, 12, 24]);
  adicionarRodape(validacao, Math.max(7, 7 + avisos.length), avisos.length
    ? "Revise as variedades listadas nesta aba. Elas não entram nos cálculos de crisântemos até serem classificadas no catálogo."
    : "Nenhum registro não classificado foi encontrado no período selecionado.", 8);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dados-colheita-crisantemos-${analise.filtros.ano}-${moment().format("YYYYMMDD-HHmm")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
