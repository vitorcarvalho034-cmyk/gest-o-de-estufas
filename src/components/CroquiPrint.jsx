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
  <title>Croqui de Plantio</title>
  <style>
    @page { size: A3 landscape; margin: 10mm; }
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; font-size: 8px; background: #fff; padding: 10px; }
    .title { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 20px; }
    .estufa-section { margin-bottom: 40px; page-break-inside: avoid; }
    .estufa-label { font-size: 11px; font-weight: bold; margin-bottom: 10px; color: #c00; writing-mode: vertical-rl; float: left; margin-right: 10px; }
    .estufa-content { display: flex; gap: 0; }
    .lado-container { }
    .lado-header { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 5px; }
    .lado-row { display: flex; gap: 20px; margin-bottom: 40px; }
    .vao-box { border: 2px solid #000; background: #fff; }
    .vao-header { background: #90ee90; padding: 5px; text-align: center; font-weight: bold; font-size: 9px; border-bottom: 2px solid #000; }
    .vao-body { display: flex; }
    .lado-label { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: bold; font-size: 8px; padding: 5px 2px; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center; background: #fff; min-width: 20px; }
    .canteiro-group { display: flex; border-right: 1px solid #000; }
    .canteiro-group:last-child { border-right: none; }
    .canteiro { flex: 1; border-right: 1px solid #000; min-width: 40px; display: flex; flex-direction: column; }
    .canteiro:last-child { border-right: none; }
    .canteiro-header { text-align: center; font-size: 8px; font-weight: bold; padding: 2px; border-bottom: 1px solid #000; background: #f5f5f5; height: 14px; display: flex; align-items: center; justify-content: center; }
    .canteiro-content { flex: 1; padding: 3px; font-size: 7px; word-wrap: break-word; min-height: 60px; }
    .canteiro-footer { text-align: center; font-size: 8px; font-weight: bold; padding: 2px; border-top: 1px solid #000; background: #e0f0ff; height: 14px; display: flex; align-items: center; justify-content: center; }
    .vao-footer { background: #b0e0ff; padding: 5px; text-align: center; font-weight: bold; font-size: 8px; border-top: 2px solid #000; }
    .separator { width: 3px; background: #ffeb3b; border-left: 2px solid #ffeb3b; border-right: 2px solid #ffeb3b; }
  </style>
</head>
<body>
  <div class="title">Croqui de Plantio — SEM ${String(semana).padStart(2,"0")}</div>
  ${estufas.map(estufa => {
    const vaos = getVaosForEstufa(items, estufa);
    const ladoB = (map[estufa] || {})["B"] || {};
    const ladoA = (map[estufa] || {})["A"] || {};

    function renderCanteiro(entries) {
      if (!entries || entries.length === 0) return "";
      return entries.map(e => `${e.variedade.substring(0, 12)} (${e.quantidade})`).join("<br/>");
    }

    function renderLadoRow(lado, vaoMap, leadoChar) {
      return `
      <div class="lado-row">
        <div class="lado-label" style="margin-top: 30px;">${leadoChar}</div>
        ${vaos.map((v, vi) => `
          <div class="vao-box">
            <div class="vao-header">VÃO ${String(v).padStart(2,"0")}</div>
            <div class="vao-body">
              <div style="display: flex; flex: 1;">
                ${[1,2,3,4].map(c => `
                  <div class="canteiro">
                    <div class="canteiro-header">C${c}</div>
                    <div class="canteiro-content">${renderCanteiro((vaoMap[v]||{})[c])}</div>
                    <div class="canteiro-footer">C${c}</div>
                  </div>
                `).join("")}
              </div>
            </div>
            <div class="vao-footer">VÃO ${String(v).padStart(2,"0")}</div>
          </div>
          ${vi < vaos.length - 1 ? '<div class="separator"></div>' : ""}
        `).join("")}
      </div>
      `;
    }

    return `
    <div class="estufa-section">
      <div style="font-size: 10px; font-weight: bold; margin-bottom: 10px; color: #c00;">ESTUFA ${String(estufa).padStart(2,"0")}</div>
      ${renderLadoRow("B", ladoB, "B")}
      <div style="margin: 30px 0;"></div>
      ${renderLadoRow("A", ladoA, "A")}
      <div style="clear: both;"></div>
    </div>
    `;
  }).join("")}
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}