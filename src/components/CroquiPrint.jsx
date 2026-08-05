import moment from "moment";

// ─── Paleta de cores por variedade ───────────────────────────────────────────
const PALETTE = [
  '#1a56db', '#7e3af2', '#0e9f6e', '#b45309', '#d61f69',
  '#3f83f8', '#6875f5', '#059669', '#92400e', '#be185d',
  '#2563eb', '#7c3aed', '#047857', '#b45309', '#9d174d',
];
const _colorMap = {};
let _colorIdx = 0;

function varColor(name) {
  if (!name) return '#111827';
  const low = name.toLowerCase();
  if (low.includes('girassol')) return '#dc2626';
  return '#111827';
}

// ─── Monta mapa: estufa → vao → { ladoA, ladoB, data } ──────────────────────
function buildMap(plantios) {
  const map = {};
  for (const p of plantios) {
    const estufa = Number(p.estufa);
    const vao    = Number(p.vao);
    const lado   = (p.lado || '').toUpperCase();
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
    const ladoKey = lado === 'A' ? 'ladoA' : 'ladoB';
    if (!map[estufa][vao][ladoKey][cant]) map[estufa][vao][ladoKey][cant] = [];
    map[estufa][vao][ladoKey][cant].push({
      variedade: p.variedade || '',
      quantidade: p.quantidade || 0,
    });
    if (!map[estufa][vao].data || p.data_plantio > map[estufa][vao].data) {
      map[estufa][vao].data = p.data_plantio;
    }
  }
  return map;
}

// ─── Gera HTML do croqui ─────────────────────────────────────────────────────
function gerarHtml(plantios, semana, ano) {
  // Resetar paleta a cada geração
  Object.keys(_colorMap).forEach(k => delete _colorMap[k]);
  _colorIdx = 0;

  const map     = buildMap(plantios);
  const estufas = Object.keys(map).map(Number).sort((a, b) => a - b);

  const CSS = `
    @page { size: A3 landscape; margin: 6mm; }
    @media print {
      .no-print { display:none!important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { font-family: Arial, sans-serif; background:#fff; padding:8px; }

    .print-btn {
      display:block; margin:0 auto 12px; padding:8px 28px;
      background:#16a34a; color:#fff; border:none; border-radius:6px;
      font-size:14px; cursor:pointer; font-weight:bold;
    }
    .estufa-wrap { margin-bottom:32px; }

    table.croqui { border-collapse:collapse; table-layout:fixed; }
    table.croqui td, table.croqui th { padding:0; }

    /* coluna EST vertical */
    .td-est {
      background:#c6efce; border:2px solid #555;
      writing-mode:vertical-rl; transform:rotate(180deg);
      text-align:center; font-weight:bold; font-size:13px; color:#c00;
      width:26px; min-width:26px;
    }

    /* linha SEM */
    .td-sem {
      background:#d9e1f2; border:2px solid #555;
      text-align:center; font-weight:bold; font-size:15px;
      font-style:italic; padding:5px 0; color:#1e3a8a;
    }

    /* cabeçalho/rodapé VÃO */
    .td-vao {
      background:#c6efce; border:2px solid #555;
      text-align:center; font-weight:bold; font-size:10px; padding:4px 0;
      color:#065f46;
    }

    /* separador laranja */
    .td-sep { background:#f97316; border:none; width:12px; min-width:12px; }

    /* célula de canteiro — texto VERTICAL */
    .td-cant {
      border:1px solid #9ca3af;
      width:90px; min-width:90px; height:170px;
      vertical-align:middle; text-align:center;
      background:#fff; padding:2px;
      overflow:hidden;
    }
    .td-cant-empty {
      border:1px solid #d1d5db;
      width:90px; min-width:90px; height:170px;
      background:#f9fafb;
    }
    .cant-inner {
      writing-mode:vertical-rl;
      text-orientation:mixed;
      transform:rotate(180deg);
      display:inline-flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      height:100%;
      gap:4px;
    }
    .cant-item {
      font-size:11px;
      font-weight:600;
      line-height:1.3;
      white-space:nowrap;
    }

    /* label C1 C2 C3 C4 */
    .td-clabel {
      border:1px solid #9ca3af; text-align:center;
      font-size:9px; font-weight:bold; padding:3px 0;
      background:#f3f4f6; color:#374151;
      width:90px; min-width:90px;
    }

    /* coluna LADO vertical */
    .td-lado {
      background:#fef9c3; border:2px solid #555;
      writing-mode:vertical-rl; transform:rotate(180deg);
      text-align:center; font-weight:bold; font-size:9px; color:#92400e;
      width:20px; min-width:20px; padding:2px;
      letter-spacing:2px;
    }

    /* linha Entrada */
    .td-entrada {
      text-align:center; font-size:9px; font-weight:bold;
      padding:4px 0; background:#fffde7; color:#555;
      border-top:2px solid #555; border-bottom:2px solid #555;
    }

    /* data plantio */
    .td-data-label {
      border:1px solid #9ca3af; font-size:9px; font-weight:bold;
      padding:3px 5px; background:#f3f4f6; white-space:nowrap;
    }
    .td-data-val {
      border:1px solid #9ca3af; text-align:center;
      font-size:9px; padding:3px 0; background:#fff;
    }
  `;

  function renderCantCell(entries) {
    if (!entries || entries.length === 0) return '<td class="td-cant-empty"></td>';
    const items = entries.map(e => {
      const color = varColor(e.variedade);
      const bold  = e.variedade?.toLowerCase().includes('girassol') ? '700' : '600';
      return `<span class="cant-item" style="color:${color};font-weight:${bold};">${e.variedade} ${Number(e.quantidade).toLocaleString('pt-BR')}</span>`;
    }).join('');
    return `<td class="td-cant"><div class="cant-inner">${items}</div></td>`;
  }

  function renderLadoRow(vaos, vaosMap, ladoKey) {
    return vaos.map((v, vi) => {
      const lado  = vaosMap[v][ladoKey];
      const cells = [1,2,3,4].map(c => renderCantCell(lado[c])).join('');
      const sep   = vi < vaos.length - 1 ? `<td class="td-sep" rowspan="1"></td>` : '';
      return cells + sep;
    }).join('');
  }

  function renderCLabels(vaos) {
    return vaos.map((v, vi) => {
      const cells = [1,2,3,4].map(c => `<td class="td-clabel">C${c}</td>`).join('');
      const sep   = vi < vaos.length - 1 ? `<td class="td-sep"></td>` : '';
      return cells + sep;
    }).join('');
  }

  function renderVaoRow(vaos, cssClass) {
    return vaos.map((v, vi) => {
      const h   = `<td colspan="4" class="${cssClass}">VÃO ${String(v).padStart(2,'0')}</td>`;
      const sep = vi < vaos.length - 1 ? `<td class="td-sep"></td>` : '';
      return h + sep;
    }).join('');
  }

  function renderDataRow(vaos, vaosMap) {
    return vaos.map((v, vi) => {
      const data = vaosMap[v].data
        ? moment(vaosMap[v].data).format('DD/MM/YYYY') : '—';
      const cell = `<td colspan="4" class="td-data-val">${data}</td>`;
      const sep  = vi < vaos.length - 1 ? `<td class="td-sep"></td>` : '';
      return cell + sep;
    }).join('');
  }

  function totalCols(numVaos) {
    // 4 canteiros por vão + separadores entre vãos + 1 coluna LADO
    return numVaos * 4 + (numVaos - 1) + 1;
  }

  // Dividir vãos em páginas de 5
  const PAGE_SIZE = 5;

  const estufasHtml = estufas.map(estufa => {
    const vaosMap  = map[estufa];
    const allVaos  = Object.keys(vaosMap).map(Number).sort((a, b) => a - b);

    const pages = [];
    for (let i = 0; i < allVaos.length; i += PAGE_SIZE) {
      pages.push(allVaos.slice(i, i + PAGE_SIZE));
    }

    return pages.map((vaos, pi) => {
      const nCols = totalCols(vaos.length);
      const pb    = pi < pages.length - 1 ? 'page-break-after:always;' : '';

      return `
<div class="estufa-wrap" style="${pb}">
<table class="croqui">
<tbody>

<!-- SEM -->
<tr>
  <td class="td-est" rowspan="9">EST:${String(estufa).padStart(2,'0')}</td>
  <td colspan="${nCols}" class="td-sem">SEM :${String(semana).padStart(2,'0')}</td>
</tr>

<!-- VÃO header -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderVaoRow(vaos, 'td-vao')}
</tr>

<!-- LADO A (em cima) -->
<tr>
  <td class="td-lado">LADO A</td>
  ${renderLadoRow(vaos, vaosMap, 'ladoA')}
</tr>

<!-- Labels C1-C4 lado A -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderCLabels(vaos)}
</tr>

<!-- Entrada -->
<tr>
  <td colspan="${nCols}" class="td-entrada">Entrada</td>
</tr>

<!-- Labels C1-C4 lado B -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderCLabels(vaos)}
</tr>

<!-- LADO B (embaixo) -->
<tr>
  <td class="td-lado">LADO B</td>
  ${renderLadoRow(vaos, vaosMap, 'ladoB')}
</tr>

<!-- VÃO footer -->
<tr>
  <td class="td-sep" style="background:transparent;border:none;"></td>
  ${renderVaoRow(vaos, 'td-vao')}
</tr>

<!-- Data plantio -->
<tr>
  <td class="td-data-label">Data plantio</td>
  ${renderDataRow(vaos, vaosMap)}
</tr>

</tbody>
</table>
</div>`;
    }).join('');
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Croqui de Plantio — SEM ${String(semana).padStart(2,'0')}/${ano}</title>
  <style>${CSS}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir</button>
  <div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:16px;" class="no-print">
    Croqui de Plantio — SEM ${String(semana).padStart(2,'0')} / ${ano}
  </div>
  ${estufasHtml}
</body>
</html>`;
}

// ─── API pública ─────────────────────────────────────────────────────────────

export function printCroquiFromPlantios(plantios, dataRef, autoprint = true) {
  if (!plantios || plantios.length === 0) {
    alert('Nenhum plantio para gerar croqui.');
    return;
  }
  const m      = moment(dataRef || plantios[0]?.data_plantio);
  const semana = m.isoWeek();
  const ano    = m.year();
  const html   = gerarHtml(plantios, semana, ano);

  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup bloqueado! Permita popups para este site e tente novamente.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  if (autoprint) setTimeout(() => win.print(), 700);
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
