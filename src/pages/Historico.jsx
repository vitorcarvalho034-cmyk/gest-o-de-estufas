import { useState, useEffect } from "react";
import { canteirosAPI } from "@/api/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { History, Sprout, Calendar, Download, GitCompare, X } from "lucide-react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

function StatPill({ label, value, color }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${color}`}>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Historico() {
  const [historicos, setHistoricos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstufa, setFiltroEstufa] = useState("todas");
  const [buscaVariedade, setBuscaVariedade] = useState("");
  const [comparando, setComparando] = useState([]);

  function toggleComparar(id) {
    setComparando((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  function exportPDF(filtrados) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Histórico de Vãos — Flores da Terra", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em ${moment().format("DD/MM/YYYY HH:mm")}`, 14, 28);
    doc.setFontSize(11);
    let y = 40;
    filtrados.forEach((h, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont(undefined, "bold");
      doc.text(`${idx + 1}. E${h.estufa} — ${h.lado} — Vão ${h.vao} — C${h.numero}`, 14, y);
      doc.setFont(undefined, "normal");
      y += 6;
      const vars = (h.variedades_ultimo_ciclo || h.variedades || []);
      const varStr = vars.map((v) => `${v.nome || v.variedade} (${v.quantidade})`).join(", ") || "—";
      doc.text(`Variedades: ${varStr}`, 14, y); y += 5;
      doc.text(`Plantio: ${h.data_plantio_ultimo ? moment(h.data_plantio_ultimo).format("DD/MM/YYYY") : "—"}   Finalização: ${h.data_finalizacao ? moment(h.data_finalizacao).format("DD/MM/YYYY") : "—"}`, 14, y); y += 5;
      doc.text(`Colhido: ${h.total_colhido_cestos || 0} cestos / ${h.total_colhido_hastes || 0} hastes   Descarte: ${h.total_descartado || 0}`, 14, y); y += 8;
      doc.setDrawColor(220, 220, 220);
      doc.line(14, y - 2, 196, y - 2);
    });
    doc.save(`historico-vaos-${moment().format("YYYY-MM-DD")}.pdf`);
  }

  useEffect(() => {
    async function load() {
      try {
        // Busca canteiros que já foram finalizados (têm data_finalizacao preenchida)
        const canteiros = await canteirosAPI.listFinalizados();
        setHistoricos(Array.isArray(canteiros) ? canteiros : []);
      } catch (e) {
        console.warn("Historico load error:", e);
        setHistoricos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtrados = historicos
    .filter((h) => filtroEstufa === "todas" || String(h.estufa) === filtroEstufa)
    .filter((h) => {
      if (!buscaVariedade) return true;
      const vars = h.variedades_ultimo_ciclo || h.variedades || [];
      return vars.some((v) =>
        (v.nome || v.variedade || "").toLowerCase().includes(buscaVariedade.toLowerCase())
      );
    });

  const ciclosComparados = comparando.map((id) => historicos.find((h) => h.id === id)).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Vãos</h1>
          </div>
          <p className="text-muted-foreground">Ciclos finalizados arquivados para comparação</p>
        </div>
        <div className="flex gap-2">
          {comparando.length > 0 && (
            <Button variant="outline" onClick={() => setComparando([])} className="gap-2">
              <X className="w-4 h-4" /> Limpar comparação
            </Button>
          )}
          {filtrados.length > 0 && (
            <Button variant="outline" onClick={() => exportPDF(filtrados)} className="gap-2">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Comparativo */}
      {ciclosComparados.length === 2 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Comparativo de Ciclos</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {ciclosComparados.map((h) => {
              const vars = h.variedades_ultimo_ciclo || h.variedades || [];
              const duracao = h.data_plantio_ultimo && h.data_finalizacao
                ? moment(h.data_finalizacao).diff(moment(h.data_plantio_ultimo), "days")
                : null;
              return (
                <div key={h.id} className="bg-white rounded-lg p-4 border space-y-2">
                  <p className="font-bold text-sm">E{h.estufa} — {h.lado} — Vão {h.vao} — C{h.numero}</p>
                  <p className="text-xs text-muted-foreground">{vars.map((v) => v.nome || v.variedade).join(", ") || "—"}</p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-lg font-bold text-primary">{h.total_mudas || 0}</p>
                      <p className="text-[10px] text-muted-foreground">mudas</p>
                    </div>
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-lg font-bold text-chart-2">{h.total_colhido_cestos || 0}</p>
                      <p className="text-[10px] text-muted-foreground">cestos</p>
                    </div>
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-lg font-bold text-chart-3">{h.total_colhido_hastes || 0}</p>
                      <p className="text-[10px] text-muted-foreground">hastes</p>
                    </div>
                    <div className="bg-muted/40 rounded p-2">
                      <p className="text-lg font-bold text-destructive">{h.total_descartado || 0}</p>
                      <p className="text-[10px] text-muted-foreground">descarte</p>
                    </div>
                  </div>
                  {duracao !== null && (
                    <p className="text-xs text-center text-primary font-semibold">
                      Ciclo de {duracao} dias
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por variedade..."
          value={buscaVariedade}
          onChange={(e) => setBuscaVariedade(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {buscaVariedade && (
          <button onClick={() => setBuscaVariedade("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
        )}
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {["todas", "1", "2", "3", "4"].map((op) => (
          <button
            key={op}
            onClick={() => setFiltroEstufa(op)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filtroEstufa === op
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {op === "todas" ? "Todas as estufas" : `Estufa ${op}`}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {filtrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{filtrados.length}</p>
              <p className="text-xs text-muted-foreground mt-1">ciclos finalizados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-chart-2">{filtrados.reduce((s, h) => s + (h.total_colhido_cestos || 0), 0).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-1">cestos colhidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-chart-3">{filtrados.reduce((s, h) => s + (h.total_colhido_hastes || 0), 0).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-1">hastes colhidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{filtrados.reduce((s, h) => s + (h.total_descartado || 0), 0).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground mt-1">mudas descartadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum ciclo finalizado ainda</p>
          <p className="text-sm mt-1">Ao finalizar um vão, ele será arquivado aqui para comparação</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((h) => {
            const vars = h.variedades_ultimo_ciclo || h.variedades || [];
            const duracao = h.data_plantio_ultimo && h.data_finalizacao
              ? moment(h.data_finalizacao).diff(moment(h.data_plantio_ultimo), "days")
              : null;
            return (
              <Card key={h.id} className={`hover:shadow-md transition-shadow cursor-pointer border-2 ${ comparando.includes(h.id) ? "border-primary" : "border-border" }`}>
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-base">E{h.estufa} — {h.lado} — Vão {h.vao} — C{h.numero}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Finalizado em {h.data_finalizacao ? moment(h.data_finalizacao).format("DD/MM/YYYY") : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                        {h.total_mudas || 0} mudas
                      </span>
                      <button
                        onClick={() => toggleComparar(h.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                          comparando.includes(h.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {comparando.includes(h.id) ? "✓ Selecionado" : "Comparar"}
                      </button>
                    </div>
                  </div>

                  {/* Variedades */}
                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vars.map((v, i) => (
                        <span key={i} className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
                          {v.nome || v.variedade} ({v.quantidade})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Datas do ciclo */}
                  <div className="text-xs space-y-1 bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Sprout className="w-3 h-3" /> Plantio</span>
                      <span className="font-medium">{h.data_plantio_ultimo ? moment(h.data_plantio_ultimo).format("DD/MM/YYYY") : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">✂️ Corte de luz</span>
                      <span className="font-medium">{h.data_corte_luz_ultimo ? moment(h.data_corte_luz_ultimo).format("DD/MM/YYYY") : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🌸 Prev. colheita</span>
                      <span className="font-medium">{h.data_previsao_colheita_ultimo ? moment(h.data_previsao_colheita_ultimo).format("DD/MM/YYYY") : "—"}</span>
                    </div>
                    {duracao !== null && (
                      <div className="flex justify-between border-t border-border/40 pt-1 mt-1">
                        <span className="text-muted-foreground">⏱ Duração do ciclo</span>
                        <span className="font-semibold text-primary">{duracao} dias</span>
                      </div>
                    )}
                  </div>

                  {/* Métricas de produção */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatPill label="cestos" value={h.total_colhido_cestos || 0} color="bg-chart-2/10" />
                    <StatPill label="hastes" value={h.total_colhido_hastes || 0} color="bg-chart-3/10" />
                    <StatPill label="descarte" value={h.total_descartado || 0} color="bg-destructive/10" />
                  </div>

                  {h.observacao_finalizacao && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{h.observacao_finalizacao}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
