import moment from "moment";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMapFromPlantios(plantios) {
  // map: estufa -> vao -> lado -> canteiro -> { variedades: [{variedade, quantidade}], data }
  const map = {};
  for (const p of plantios) {
    const { estufa, vao, lado, canteiro, variedade, quantidade, data_plantio } = p;
    if (!map[estufa]) map[estufa] = {};
    if (!map[estufa][vao]) map[estufa][vao] = { A: {}, B: {}, data: data_plantio };
    if (!map[estufa][vao][lado]) map[estufa][vao][lado] = {};
    if (!map[estufa][vao][lado][canteiro]) map[estufa][vao][lado][canteiro] = [];
    map[estufa][vao][lado][canteiro].push({ variedade: variedade || "", quantidade: quantidade || 0 });
    // Pega a data mais recente do vão
    if (!map[estufa][vao].data || data_plantio > map[estufa][vao].data) {
      map[estufa][vao].data = data_plantio;
    }
  }
  return map;
}

// ─── Gerador de HTML do croqui ───────────────────────────────────────────────

function gerarHtmlCroqui(plantios, semana, ano) {
  const map = buildMapFromPlantios(plantios);
  const estufas = Object.keys(map).map(Number).sort((a, b) => a - b);

  function renderCanteiro(entries) {
    if (!entries || entries.length === 0) return "";
    return entries
      .map(e => `<div style="font-size:7px;line-height:1.3;">${e.variedade}<br/><span style="color:#555;">${e.quantidade} mudas</span></div>`)
      .join("");
  }

  const estufasHtml = estufas.map(estufa => {
    const vaosMap = map[estufa];
    const vaos = Object.keys(vaosMap).map(Number).sort((a, b) => a - b);
    const numVaos = vaos.length;

    // Cada vão tem 4 canteiros + 1 separador laranja (exceto o último)
    // Largura total: numVaos * 4 canteiros + (numVaos-1) separadores
    const totalCols = numVaos * 4 + (numVaos - 1);

    function renderLadoRow(lado) {
      return vaos.map((v, vi) => {
        const ladoData = (vaosMap[v] || {})[lado] || {};
        const cells = [1, 2, 3, 4].map(c => {
          const entries = ladoData[c] || [];
          return `<td style="
            border: 1px solid #aaa;
            width: 60px;
            min-width: 60px;
            height: 90px;
            vertical-align: top;
            padding: 3px;
            background: #fff;
          ">${renderCanteiro(entries)}</td>`;
        }).join("");

        const sep = vi < vaos.length - 1
          ? `<td style="width:8px;min-width:8px;background:#f90;border:1px solid #e07000;"></td>`
          : "";

        return cells + sep;
      }).join("");
    }

    function renderCLabels() {
      return vaos.map((v, vi) => {
        const cells = [1, 2, 3, 4].map(c =>
          `<td style="border:1px solid #aaa;text-align:center;font-size:8px;font-weight:bold;padding:2px;background:#f2f2f2;width:60px;">C${c}</td>`
        ).join("");
        const sep = vi < vaos.length - 1
          ? `<td style="width:8px;background:#f90;border:1px solid #e07000;"></td>`
          : "";
        return cells + sep;
      }).join("");
    }

    function renderVaoHeaders() {
      return vaos.map((v, vi) => {
        const header = `<td colspan="4" style="
          background:#c6efce;
          border:2px solid #555;
          text-align:center;
          font-weight:bold;
          font-size:9px;
          padding:4px;
        ">VÃO ${String(v).padStart(2, "0")}</td>`;
        const sep = vi < vaos.length - 1
          ? `<td style="width:8px;background:#f90;border:1px solid #e07000;"></td>`
          : "";
        return header + sep;
      }).join("");
    }

    function renderVaoFooters() {
      return vaos.map((v, vi) => {
        const footer = `<td colspan="4" style="
          background:#c6efce;
          border:2px solid #555;
          text-align:center;
          font-weight:bold;
          font-size:9px;
          padding:4px;
        ">VÃO ${String(v).padStart(2, "0")}</td>`;
        const sep = vi < vaos.length - 1
          ? `<td style="width:8px;background:#f90;border:1px solid #e07000;"></td>`
          : "";
        return footer + sep;
      }).join("");
    }

    function renderDataRow(label) {
      return vaos.map((v, vi) => {
        const data = vaosMap[v]?.data ? moment(vaosMap[v].data).format("DD/MM/YYYY") : "—";
        const cell = `<td colspan="4" style="
          border:1px solid #aaa;
          text-align:center;
          font-size:8px;
          padding:2px;
          background:#fff;
        ">${data}</td>`;
        const sep = vi < vaos.length - 1
          ? `<td style="width:8px;background:#f90;border:1px solid #e07000;"></td>`
          : "";
        return cell + sep;
      }).join("");
    }

    return `
    <div style="margin-bottom:40px;page-break-inside:avoid;">
      <table style="border-collapse:collapse;table-layout:fixed;">
        <tbody>
          <!-- Linha 1: EST + SEM -->
          <tr>
            <td rowspan="9" style="
              background:#c6efce;
              border:2px solid #555;
              text-align:center;
              width:28px;
              min-width:28px;
              writing-mode:vertical-rl;
              transform:rotate(180deg);
              font-weight:bold;
              font-size:11px;
              color:#c00;
              padding:4px;
            ">EST:${String(estufa).padStart(2,"0")}</td>
            <td colspan="${totalCols}" style="
              background:#d9e1f2;
              border:2px solid #555;
              text-align:center;
              font-weight:bold;
              font-size:13px;
              padding:5px;
            ">SEM :${String(semana).padStart(2,"0")}</td>
          </tr>
          <!-- Linha 2: VÃO headers -->
          <tr>${renderVaoHeaders()}</tr>
          <!-- Linha 3: Lado B cells -->
          <tr>
            <td style="
              background:#ffeb9c;
              border:2px solid #555;
              text-align:center;
              width:20px;
              min-width:20px;
              writing-mode:vertical-rl;
              transform:rotate(180deg);
              font-weight:bold;
              font-size:9px;
              color:#c00;
              padding:2px;
            " rowspan="1">L<br/>A<br/>D<br/>O<br/><br/>B</td>
            ${renderLadoRow("B")}
          </tr>
          <!-- Linha 4: C labels B -->
          <tr>${renderCLabels()}</tr>
          <!-- Linha 5: Entrada -->
          <tr>
            <td colspan="${totalCols}" style="
              text-align:center;
              font-size:9px;
              font-weight:bold;
              padding:3px;
              background:#fffde7;
              border-top:2px solid #555;
              border-bottom:2px solid #555;
              color:#555;
            ">Entrada</td>
          </tr>
          <!-- Linha 6: C labels A -->
          <tr>${renderCLabels()}</tr>
          <!-- Linha 7: Lado A cells -->
          <tr>
            <td style="
              background:#ffeb9c;
              border:2px solid #555;
              text-align:center;
              width:20px;
              min-width:20px;
              writing-mode:vertical-rl;
              transform:rotate(180deg);
              font-weight:bold;
              font-size:9px;
              color:#c00;
              padding:2px;
            " rowspan="1">L<br/>A<br/>D<br/>O<br/><br/>A</td>
            ${renderLadoRow("A")}
          </tr>
          <!-- Linha 8: VÃO footers -->
          <tr>${renderVaoFooters()}</tr>
          <!-- Linha 9: Data plantio -->
          <tr>
            <td style="font-size:8px;font-weight:bold;padding:2px;border:1px solid #aaa;background:#f9f9f9;white-space:nowrap;">Data plantio</td>
            ${renderDataRow("Data plantio")}
          </tr>
        </tbody>
      </table>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Croqui de Plantio — SEM ${String(semana).padStart(2,"0")}/${ano}</title>
  <style>
    @page { size: A3 landscape; margin: 8mm; }
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: Arial, sans-serif; font-size: 9px; background: #fff; padding: 10px; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 16px; }
    .print-btn {
      display: block;
      margin: 0 auto 16px;
      padding: 8px 24px;
      background: #16a34a;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir</button>
  <div class="title">Croqui de Plantio — SEM ${String(semana).padStart(2,"0")} / ${ano}</div>
  ${estufasHtml}
</body>
</html>`;
}

// ─── Função principal exportada ──────────────────────────────────────────────

/**
 * Imprime o croqui a partir de uma lista de plantios (formato do supabaseClient).
 * @param {Array} plantios - lista de objetos { estufa, vao, lado, canteiro, variedade, quantidade, data_plantio, semana }
 * @param {string|Date} dataRef - data de referência para calcular semana/ano
 * @param {boolean} autoprint - se true, abre o diálogo de impressão automaticamente
 */
export function printCroquiFromPlantios(plantios, dataRef, autoprint = true) {
  if (!plantios || plantios.length === 0) {
    alert("Nenhum plantio para gerar croqui.");
    return;
  }
  const m = moment(dataRef || plantios[0]?.data_plantio);
  const semana = m.isoWeek();
  const ano = m.year();

  const html = gerarHtmlCroqui(plantios, semana, ano);

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloqueado! Permita popups para este site e tente novamente.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  if (autoprint) {
    setTimeout(() => win.print(), 600);
  }
}

/**
 * Mantém compatibilidade com o formato antigo (items com allocations).
 * @deprecated Use printCroquiFromPlantios
 */
export function printCroqui(items, dataPlantio) {
  // Converte formato antigo para novo
  const plantios = [];
  for (const item of items) {
    for (const alloc of (item.allocations || [])) {
      plantios.push({
        estufa: alloc.estufa,
        vao: alloc.vao,
        lado: alloc.lado,
        canteiro: alloc.canteiro,
        variedade: item.variedade,
        quantidade: alloc.quantidade,
        data_plantio: dataPlantio,
        semana: moment(dataPlantio).isoWeek(),
      });
    }
  }
  printCroquiFromPlantios(plantios, dataPlantio, true);
}
