import moment from "moment";

// ─── Monta mapa: estufa → vao → { ladoA: {1:[],2:[],3:[],4:[]}, ladoB: {...}, data } ──
function buildMap(plantios) {
  const map = {};
  for (const p of plantios) {
    const estufa = Number(p.estufa);
    const vao    = Number(p.vao);
    const lado   = (p.lado || "").toUpperCase();
    const cant   = Number(p.canteiro);
    if (!estufa || !vao || !lado || !cant) continue;

    if (!map[estufa]) map[estufa] = {};
    if (!map[estufa][vao]) {
      map[estufa][vao] = {
        ladoA: { 1: [], 2: [], 3: [], 4: [] },
        ladoB: { 1: [], 2: [], 3: [], 4: [] },
        data: p.data_plantio,
      };
    }
    const ladoKey = lado === "A" ? "ladoA" : "ladoB";
    if (!map[estufa][vao][ladoKey][cant]) map[estufa][vao][ladoKey][cant] = [];
    map[estufa][vao][ladoKey][cant].push({
      variedade: p.variedade || "",
      quantidade: p.quantidade || 0,
    });
    // data mais recente do vão
    if (!map[estufa][vao].data || p.data_plantio > map[estufa][vao].data) {
      map[estufa][vao].data = p.data_plantio;
    }
  }
  return map;
}

// ─── Gera HTML do croqui ─────────────────────────────────────────────────────
function gerarHtml(plantios, semana, ano) {
  const map   = buildMap(plantios);
  const estufas = Object.keys(map).map(Number).sort((a, b) => a - b);

  const CSS = `
    @page { size: A3 landscape; margin: 6mm; }
    @media print { .no-print { display:none!important; } }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { font-family: Arial, sans-serif; background:#fff; padding:8px; }
    .print-btn {
      display:block; margin:0 auto 12px; padding:7px 22px;
      background:#16a34a; color:#fff; border:none; border-radius:6px;
      font-size:13px; cursor:pointer;
    }
    .estufa-wrap { margin-bottom:28px; page-break-inside:avoid; }

    /* tabela principal */
    table.croqui { border-collapse:collapse; table-layout:fixed; }
    table.croqui td, table.croqui th { padding:0; }

    /* coluna EST vertical */
    .td-est {
      background:#c6efce; border:2px solid #555;
      writing-mode:vertical-rl; transform:rotate(180deg);
      text-align:center; font-weight:bold; font-size:11px; color:#c00;
      width:24px; min-width:24px;
    }

    /* linha SEM */
    .td-sem {
      background:#d9e1f2; border:2px solid #555;
      text-align:center; font-weight:bold; font-size:13px; padding:4px 0;
    }

    /* cabeçalho VÃO */
    .td-vao-header {
      background:#c6efce; border:2px solid #555;
      text-align:center; font-weight:bold; font-size:9px; padding:3px 0;
    }

    /* separador laranja entre vãos */
    .td-sep { background:#f90; border:1px solid #e07000; width:10px; min-width:10px; }

    /* célula de canteiro com dados */
    .td-cant {
      border:1px solid #aaa; width:80px; min-width:80px; height:80px;
      vertical-align:top; padding:3px; background:#fff; font-size:7px;
    }
    .cant-item { line-height:1.4; margin-bottom:2px; }
    .cant-qtd  { color:#555; font-size:6.5px; }

    /* linha C1 C2 C3 C4 */
    .td-clabel {
      border:1px solid #aaa; text-align:center; font-size:8px;
      font-weight:bold; padding:2px 0; background:#f2f2f2; width:80px;
    }

    /* linha LADO (vertical) */
    .td-lado {
      background:#ffeb9c; border:2px solid #555;
      writing-mode:vertical-rl; transform:rotate(180deg);
      text-align:center; font-weight:bold; font-size:8px; color:#c00;
      width:18px; min-width:18px; padding:2px;
    }

    /* linha Entrada */
    .td-entrada {
      text-align:center; font-size:8px; font-weight:bold;
      padding:3px 0; background:#fffde7;
      border-top:2px solid #555; border-bottom:2px solid #555; color:#555;
    }

    /* rodapé VÃO e data */
    .td-vao-footer {
      background:#c6efce; border:2px solid #555;
      text-align:center; font-weight:bold; font-size:9px; padding:3px 0;
    }
    .td-data-label {
      border:1px solid #aaa; font-size:8px; font-weight:bold;
      padding:2px 4px; background:#f9f9f9; white-space:nowrap; width:70px;
    }
    .td-data-val {
      border:1px solid #aaa; text-align:center; font-size:8px; padding:2px 0;
      background:#fff;
    }
  `;

  function renderCantCell(entries) {
    if (!entries || entries.length === 0) return "";
    return entries.map(e =>
      `<div class="cant-item">${e.variedade}<br/><span class="cant-qtd">${Number(e.quantidade).toLocaleString("pt-BR")} mudas</span></div>`
    ).join("");
  }

  // Gera as células de um lado (4 canteiros) para todos os vãos,
  // intercalando separadores laranja
  function renderLadoRow(vaos, vaosMap, ladoKey) {
    return vaos.map((v, vi) => {
      const lado = vaosMap[v][ladoKey];
      const cells = [1,2,3,4].map(c =>
        `<td class="td-cant">${renderCantCell(lado[c])}</td>`
      ).join("");
      const sep = vi < vaos.length - 1
        ? `<td class="td-sep" rowspan="1"></td>` : "";
      return cells + sep;
    }).join("");
  }

  function renderCLabels(vaos) {
    return vaos.map((v, vi) => {
      const cells = [1,2,3,4].map(c =>
        `<td class="td-clabel">C${c}</td>`
      ).join("");
      const sep = vi < vaos.length - 1
        ? `<td class="td-sep"></td>` : "";
      return cells + sep;
    }).join("");
  }

  function renderVaoHeaders(vaos) {
    return vaos.map((v, vi) => {
      const h = `<td colspan="4" class="td-vao-header">VÃO ${String(v).padStart(2,"0")}</td>`;
      const sep = vi < vaos.length - 1
        ? `<td class="td-sep"></td>` : "";
      return h + sep;
    }).join("");
  }

  function renderDataRow(vaos, vaosMap) {
    return vaos.map((v, vi) => {
      const data = vaosMap[v].data
        ? moment(vaosMap[v].data).format("DD/MM/YYYY") : "—";
      const cell = `<td colspan="4" class="td-data-val">${data}</td>`;
      const sep = vi < vaos.length - 1
        ? `<td class="td-sep"></td>` : "";
      return cell + sep;
    }).join("");
  }

  // Número total de colunas de dados (sem a coluna EST e sem a coluna LADO)
  // para cada vão: 4 canteiros + 1 separador (exceto último)
  function totalCols(numVaos) {
    return numVaos * 4 + (numVaos - 1);
  }

  const estufasHtml = estufas.map(estufa => {
    const vaosMap = map[estufa];
    const vaos    = Object.keys(vaosMap).map(Number).sort((a, b) => a - b);
    const nCols   = totalCols(vaos.length);
    // +1 para a coluna LADO
    const nColsTotal = nCols + 1;

    return `
<div class="estufa-wrap">
<table class="croqui">
<tbody>

<!-- Linha 1: EST (rowspan) + SEM -->
<tr>
  <td class="td-est" rowspan="9">EST:${String(estufa).padStart(2,"0")}</td>
  <td colspan="${nColsTotal}" class="td-sem">SEM :${String(semana).padStart(2,"0")}</td>
</tr>

<!-- Linha 2: VÃO headers (com coluna LADO vazia) -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderVaoHeaders(vaos)}
</tr>

<!-- Linha 3: Lado B (células grandes) -->
<tr>
  <td class="td-lado" rowspan="1">L<br/>A<br/>D<br/>O<br/><br/>B</td>
  ${renderLadoRow(vaos, vaosMap, "ladoB")}
</tr>

<!-- Linha 4: C labels B -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderCLabels(vaos)}
</tr>

<!-- Linha 5: Entrada -->
<tr>
  <td colspan="${nColsTotal}" class="td-entrada">Entrada</td>
</tr>

<!-- Linha 6: C labels A -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderCLabels(vaos)}
</tr>

<!-- Linha 7: Lado A (células grandes) -->
<tr>
  <td class="td-lado" rowspan="1">L<br/>A<br/>D<br/>O<br/><br/>A</td>
  ${renderLadoRow(vaos, vaosMap, "ladoA")}
</tr>

<!-- Linha 8: VÃO footers -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderVaoHeaders(vaos)}
</tr>

<!-- Linha 9: Data plantio -->
<tr>
  <td class="td-data-label">Data plantio</td>
  ${renderDataRow(vaos, vaosMap)}
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
  <style>${CSS}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir</button>
  <div style="text-align:center;font-size:15px;font-weight:bold;margin-bottom:14px;" class="no-print">
    Croqui de Plantio — SEM ${String(semana).padStart(2,"0")} / ${ano}
  </div>
  ${estufasHtml}
</body>
</html>`;
}

// ─── API pública ─────────────────────────────────────────────────────────────

export function printCroquiFromPlantios(plantios, dataRef, autoprint = true) {
  if (!plantios || plantios.length === 0) {
    alert("Nenhum plantio para gerar croqui.");
    return;
  }
  const m      = moment(dataRef || plantios[0]?.data_plantio);
  const semana = m.isoWeek();
  const ano    = m.year();
  const html   = gerarHtml(plantios, semana, ano);

  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloqueado! Permita popups para este site e tente novamente.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  if (autoprint) setTimeout(() => win.print(), 600);
}

/** @deprecated use printCroquiFromPlantios */
export function printCroqui(items, dataPlantio) {
  const plantios = [];
  for (const item of (items || [])) {
    for (const alloc of (item.allocations || [])) {
      plantios.push({
        estufa: alloc.estufa, vao: alloc.vao, lado: alloc.lado,
        canteiro: alloc.canteiro, variedade: item.variedade,
        quantidade: alloc.quantidade, data_plantio: dataPlantio,
      });
    }
  }
  printCroquiFromPlantios(plantios, dataPlantio, true);
}
