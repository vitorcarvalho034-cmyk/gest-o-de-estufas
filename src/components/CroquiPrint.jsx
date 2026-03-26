import moment from "moment";

// Builds a lookup map: estufa -> lado -> vao -> canteiro -> [{variedade, quantidade}]
function buildMap(items) {
  const map = {};
  for (const item of items) {
    for (const alloc of item.allocations) {
      const { estufa, lado, vao, canteiro, quantidade } = alloc;
      if (!map[estufa]) map[estufa] = {};
      if (!map[estufa][lado]) map[estufa][lado] = {};
      if (!map[estufa][lado][vao]) map[estufa][lado][vao] = {};
      if (!map[estufa][lado][vao][canteiro]) map[estufa][lado][vao][canteiro] = [];
      map[estufa][lado][vao][canteiro].push({ variedade: item.variedade, quantidade });
    }
  }
  return map;
}

function getEstufasInvolved(items) {
  const set = new Set();
  for (const item of items)
    for (const alloc of item.allocations)
      set.add(alloc.estufa);
  return [...set].sort((a, b) => a - b);
}

function getVaosForEstufa(items, estufa) {
  const set = new Set();
  for (const item of items)
    for (const alloc of item.allocations)
      if (alloc.estufa === estufa) set.add(alloc.vao);
  return [...set].sort((a, b) => a - b);
}

function CanteiroCell({ entries }) {
  if (!entries || entries.length === 0) {
    return <td style={styles.cell}><div style={styles.cellInner} /></td>;
  }
  return (
    <td style={styles.cell}>
      <div style={styles.cellInner}>
        {entries.map((e, i) => (
          <div key={i} style={styles.rotatedText}>
            {e.variedade} {e.quantidade}
          </div>
        ))}
      </div>
    </td>
  );
}

function EstufaTable({ estufa, items, map, semana }) {
  const vaos = getVaosForEstufa(items, estufa);
  const ladoBVaos = map[estufa]?.["B"] || {};
  const ladoAVaos = map[estufa]?.["A"] || {};

  return (
    <div style={styles.estufaBlock}>
      <table style={styles.table}>
        <thead>
          <tr>
            <td style={styles.estufaLabel} rowSpan={6}>
              <div style={styles.estufaLabelText}>ESTUFA {String(estufa).padStart(2, "0")}</div>
            </td>
            <td colSpan={vaos.length * 4} style={styles.semHeader}>
              SEM {String(semana).padStart(2, "0")}
            </td>
          </tr>
          <tr>
            {vaos.map((v) => (
              <td key={v} colSpan={4} style={styles.vaoHeader}>VÃO {String(v).padStart(2, "0")}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* LADO B */}
          <tr>
            <td style={styles.ladoLabel} rowSpan={1}>
              <div style={styles.ladoText}>L<br/>A<br/>D<br/>O<br/><br/>B</div>
            </td>
            {vaos.map((v) => (
              [1, 2, 3, 4].map((c) => (
                <CanteiroCell key={`b-${v}-${c}`} entries={(ladoBVaos[v] || {})[c]} />
              ))
            ))}
          </tr>
          {/* C labels B */}
          <tr>
            {vaos.map((v) => (
              [1, 2, 3, 4].map((c) => (
                <td key={`blabel-${v}-${c}`} style={styles.cLabel}>C{c}</td>
              ))
            ))}
          </tr>
          {/* Separator */}
          <tr>
            {vaos.map((v) => (
              [1, 2, 3, 4].map((c) => (
                <td key={`sep-${v}-${c}`} style={{ ...styles.cLabel, height: "6px", borderTop: "2px solid #555" }} />
              ))
            ))}
          </tr>
          {/* C labels A */}
          <tr>
            {vaos.map((v) => (
              [1, 2, 3, 4].map((c) => (
                <td key={`alabel-${v}-${c}`} style={styles.cLabel}>C{c}</td>
              ))
            ))}
          </tr>
          {/* LADO A */}
          <tr>
            <td style={styles.ladoLabel} rowSpan={1}>
              <div style={styles.ladoText}>L<br/>A<br/>D<br/>O<br/><br/>A</div>
            </td>
            {vaos.map((v) => (
              [1, 2, 3, 4].map((c) => (
                <CanteiroCell key={`a-${v}-${c}`} entries={(ladoAVaos[v] || {})[c]} />
              ))
            ))}
          </tr>
          {/* Vão labels bottom */}
          <tr>
            {vaos.map((v) => (
              <td key={`bvao-${v}`} colSpan={4} style={styles.vaoFooter}>VÃO {String(v).padStart(2, "0")}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { fontFamily: "Arial, sans-serif", fontSize: "10px", padding: "12px", background: "#fff" },
  title: { fontSize: "14px", fontWeight: "bold", textAlign: "center", marginBottom: "12px" },
  estufaBlock: { marginBottom: "24px", breakInside: "avoid" },
  table: { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" },
  estufaLabel: {
    background: "#c6efce", border: "1px solid #555", textAlign: "center",
    width: "28px", padding: "2px", writingMode: "vertical-rl"
  },
  estufaLabelText: { fontWeight: "bold", fontSize: "9px", transform: "rotate(180deg)", whiteSpace: "nowrap" },
  semHeader: {
    background: "#d9e1f2", border: "1px solid #555", textAlign: "center",
    fontWeight: "bold", padding: "3px", fontSize: "11px"
  },
  vaoHeader: {
    background: "#d9e1f2", border: "1px solid #555", textAlign: "center",
    fontWeight: "bold", padding: "2px", fontSize: "9px"
  },
  vaoFooter: {
    background: "#d9e1f2", border: "1px solid #555", textAlign: "center",
    fontWeight: "bold", padding: "2px", fontSize: "9px"
  },
  ladoLabel: {
    background: "#ffeb9c", border: "1px solid #555",
    textAlign: "center", width: "18px", padding: "1px"
  },
  ladoText: { fontWeight: "bold", fontSize: "8px", color: "#c00", textAlign: "center", lineHeight: "1.3" },
  cLabel: { border: "1px solid #aaa", textAlign: "center", fontSize: "8px", padding: "1px", background: "#f2f2f2" },
  cell: { border: "1px solid #aaa", height: "90px", width: "22px", padding: "1px", verticalAlign: "middle" },
  cellInner: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", gap: "2px" },
  rotatedText: {
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    fontSize: "8px",
    whiteSpace: "nowrap",
    textAlign: "center",
    lineHeight: "1.2",
  },
};

export function printCroqui(items, dataPlantio) {
  const map = buildMap(items);
  const estufas = getEstufasInvolved(items);
  const semana = moment(dataPlantio).isoWeek();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Croqui de Endereçamento</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; font-size: 8px; background: #fff; padding: 6px; }
    .title { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; font-size: 8px; margin-bottom: 8px; color: #555; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; margin-bottom: 10px; page-break-inside: avoid; }
    td { border: 1px solid #555; font-size: 7px; }
    .estufa-label { background: #c6efce; text-align: center; width: 16px; writing-mode: vertical-rl; font-weight: bold; font-size: 8px; padding: 0; }
    .estufa-label-inner { transform: rotate(180deg); display: block; }
    .sem-header { background: #d9e1f2; text-align: center; font-weight: bold; padding: 2px; font-size: 9px; }
    .vao-header { background: #d9e1f2; text-align: center; font-weight: bold; padding: 1px; font-size: 7px; }
    .lado-label { background: #ffeb9c; text-align: center; width: 12px; padding: 0; }
    .lado-text { font-weight: bold; font-size: 7px; color: #c00; text-align: center; line-height: 1.2; }
    .c-label { text-align: center; font-size: 6px; padding: 0px; background: #f2f2f2; height: 8px; }
    .cell { height: 55px; width: 18px; vertical-align: middle; padding: 1px; }
    .cell-inner { display: flex; justify-content: center; align-items: center; height: 100%; gap: 1px; }
    .rotated { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 7px; white-space: nowrap; text-align: center; line-height: 1.1; }
    .sep-row td { height: 3px; border-top: 2px solid #333 !important; background: #ddd; }
  </style>
</head>
<body>
  <div class="title">Croqui de Endereçamento</div>
  <div class="sub">Semana ${semana} — Plantio: ${moment(dataPlantio).format("DD/MM/YYYY")}</div>
  ${estufas.map(estufa => {
    const vaos = getVaosForEstufa(items, estufa);
    const ladoB = map[estufa]?.["B"] || {};
    const ladoA = map[estufa]?.["A"] || {};
    const totalCols = vaos.length * 4;

    function cellHtml(entries) {
      if (!entries || entries.length === 0) return `<td class="cell"><div class="cell-inner"></div></td>`;
      return `<td class="cell"><div class="cell-inner">${entries.map(e => `<span class="rotated">${e.variedade} ${e.quantidade}</span>`).join("")}</div></td>`;
    }

    return `
    <table>
      <tbody>
        <tr>
          <td class="estufa-label" rowspan="7"><span class="estufa-label-inner">ESTUFA ${String(estufa).padStart(2,"0")}</span></td>
          <td class="sem-header" colspan="${totalCols}">SEM ${String(semana).padStart(2,"0")}</td>
        </tr>
        <tr>${vaos.map(v => `<td class="vao-header" colspan="4">VÃO ${String(v).padStart(2,"0")}</td>`).join("")}</tr>
        <tr>
          <td class="lado-label"><div class="lado-text">L<br/>A<br/>D<br/>O<br/><br/>B</div></td>
          ${vaos.map(v => [1,2,3,4].map(c => cellHtml((ladoB[v]||{})[c])).join("")).join("")}
        </tr>
        <tr>${vaos.map(v => [1,2,3,4].map(c => `<td class="c-label">C${c}</td>`).join("")).join("")}</tr>
        <tr class="sep-row">${vaos.map(v => [1,2,3,4].map(() => `<td></td>`).join("")).join("")}</tr>
        <tr>${vaos.map(v => [1,2,3,4].map(c => `<td class="c-label">C${c}</td>`).join("")).join("")}</tr>
        <tr>
          <td class="lado-label"><div class="lado-text">L<br/>A<br/>D<br/>O<br/><br/>A</div></td>
          ${vaos.map(v => [1,2,3,4].map(c => cellHtml((ladoA[v]||{})[c])).join("")).join("")}
        </tr>
        <tr>${vaos.map(v => `<td class="vao-header" colspan="4">VÃO ${String(v).padStart(2,"0")}</td>`).join("")}</tr>
      </tbody>
    </table>`;
  }).join("")}
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}