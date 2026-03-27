import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Warehouse, Thermometer, LayoutGrid } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ESTUFA_VAOS, TOTAL_VAOS } from "@/lib/estufasConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CanteiroDialog from "../components/CanteiroDialog";

const LADO_COLORS = { A: "bg-primary/10 border-primary/30", B: "bg-accent/10 border-accent/30" };

function heatColor(pct) {
  if (pct === 0) return "bg-muted/40 border-border text-muted-foreground";
  if (pct < 25) return "bg-emerald-100 border-emerald-200 text-emerald-800";
  if (pct < 50) return "bg-emerald-200 border-emerald-300 text-emerald-900";
  if (pct < 75) return "bg-emerald-400 border-emerald-500 text-white";
  return "bg-emerald-600 border-emerald-700 text-white";
}
const CANTEIRO_EMPTY = "bg-muted/40 border-border hover:bg-muted/70 text-muted-foreground";
const CANTEIRO_PARTIAL = "bg-primary/5 border-primary/20 hover:bg-primary/10";
const CANTEIRO_FULL = "bg-primary/20 border-primary/40 hover:bg-primary/30";

function MiniCanteiro({ canteiro, onClick, numero, colheitas }) {
  const mudas = canteiro?.total_mudas || 0;
  const pct = Math.min((mudas / 2000) * 100, 100);
  const colorClass = !canteiro ? CANTEIRO_EMPTY : pct >= 80 ? CANTEIRO_FULL : CANTEIRO_PARTIAL;
  const variedades = canteiro?.variedades || [];

  const totalPressas = colheitas?.reduce((s, c) => s + (c.pressas || 0), 0) || 0;
  const totalCestos = colheitas?.reduce((s, c) => s + (c.cestos || 0), 0) || 0;
  // Colheita %: pressas colhidas vs mudas disponíveis
  const colheitaPct = mudas > 0 ? Math.min((totalPressas / mudas) * 100, 100) : 0;

  const btn = (
    <button
      onClick={() => canteiro && onClick(canteiro)}
      className={`relative w-full h-10 rounded border text-xs font-medium transition-all ${colorClass} overflow-hidden`}
    >
      {pct > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-primary/30 transition-all"
          style={{ height: `${pct}%` }}
        />
      )}
      {colheitaPct > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-amber-400/50 transition-all"
          style={{ height: `${colheitaPct}%` }}
        />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <span className="text-[10px]">{numero}</span>
        {colheitaPct > 0 && mudas > 0 && (
          <span className="text-[8px] font-semibold text-amber-700">{colheitaPct.toFixed(0)}%</span>
        )}
      </div>
    </button>
  );

  if (!canteiro || variedades.length === 0) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold text-xs mb-1">Canteiro {numero} — {mudas} mudas</p>
        {variedades.map((v, i) => (
          <p key={i} className="text-xs">{v.nome}: <span className="font-medium">{v.quantidade}</span></p>
        ))}
        {totalPressas > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-border">
            <p className="text-xs text-amber-600 font-medium">🌸 Colhido: {totalPressas} pressas ({totalCestos} cestos)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{colheitaPct.toFixed(0)}% de {mudas} mudas</p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Estufas() {
  const [canteiros, setCanteiros] = useState([]);
  const [colheitas, setColheitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanteiro, setSelectedCanteiro] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "heat"

  async function loadCanteiros() {
    const [data, cols] = await Promise.all([
      base44.entities.Canteiro.list(),
      base44.entities.Colheita.list(),
    ]);
    setCanteiros(data);
    setColheitas(cols);
    setLoading(false);
  }

  useEffect(() => { loadCanteiros(); }, []);

  function getCanteiro(estufa, lado, vao, numero) {
    return canteiros.find(
      (c) => c.estufa === estufa && c.lado === lado && c.vao === vao && c.numero === numero
    ) || null;
  }

  function getColheitas(estufa, lado, vao, numero) {
    return colheitas.filter(
      (c) => c.estufa === estufa && c.lado === lado && c.vao === vao && c.canteiro === numero
    );
  }

  function openEdit(canteiro) {
    setSelectedCanteiro(canteiro);
    setDialogOpen(true);
  }

  function getEstufaStats(estufa) {
    const ecs = canteiros.filter((c) => c.estufa === estufa);
    const total = ecs.length;
    const comMudas = ecs.filter((c) => (c.total_mudas || 0) > 0).length;
    const totalMudas = ecs.reduce((s, c) => s + (c.total_mudas || 0), 0);
    return { total, comMudas, totalMudas };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-full mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Warehouse className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Estufas</h1>
        </div>
        <p className="text-muted-foreground">Layout completo — cada vão tem 4 canteiros por lado</p>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("grid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Grade
        </button>
        <button
          onClick={() => setViewMode("heat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            viewMode === "heat" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" /> Mapa de Calor
        </button>
      </div>

      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {[1, 2, 3, 4].map((n) => {
            const s = getEstufaStats(n);
            const totalPossivel = TOTAL_VAOS[n] * 2 * 4; // vaos * lados * canteiros
            const pct = totalPossivel > 0 ? Math.round((s.comMudas / totalPossivel) * 100) : 0;
            return (
              <TabsTrigger key={n} value={String(n)} className="flex flex-col gap-0.5 h-auto py-1.5">
                <span>Estufa {n}</span>
                <span className="text-[9px] opacity-60">{pct}% ocup.</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {[1, 2, 3, 4].map((estufa) => {
          const stats = getEstufaStats(estufa);
          const totalVaos = TOTAL_VAOS[estufa];
          const vaosPerLado = ESTUFA_VAOS[estufa];

          return (
            <TabsContent key={estufa} value={String(estufa)} className="mt-6 space-y-4">
              {/* Stats bar */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-card border rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Vãos completos</p>
                  <p className="text-lg font-bold text-primary">{totalVaos}</p>
                </div>
                <div className="bg-card border rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Meio-vãos por lado</p>
                  <p className="text-lg font-bold">{vaosPerLado}</p>
                </div>
                <div className="bg-card border rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Canteiros c/ mudas</p>
                  <p className="text-lg font-bold text-primary">{stats.comMudas}</p>
                </div>
                <div className="bg-card border rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Total mudas</p>
                  <p className="text-lg font-bold">{stats.totalMudas.toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {viewMode === "heat" ? (
                // HEAT MAP VIEW
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">Legenda (ocupação por vão):</span>
                    {[["Vazio","bg-muted/40 border border-border"],["1-25%","bg-emerald-100 border border-emerald-200"],["26-50%","bg-emerald-200 border border-emerald-300"],["51-75%","bg-emerald-400 border border-emerald-500"],["76-100%","bg-emerald-600 border border-emerald-700"]].map(([label, cls]) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`w-4 h-4 rounded ${cls}`} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                    <div />
                    <div className="text-center text-xs font-semibold text-primary">Lado A</div>
                    <div className="text-center text-xs font-semibold text-amber-700">Lado B</div>
                  </div>
                  <div className="space-y-1">
                    {Array.from({ length: vaosPerLado }, (_, i) => i + 1).map((vao) => {
                      const getVaoPct = (lado) => {
                        const total = [1,2,3,4].reduce((s, n) => s + (getCanteiro(estufa, lado, vao, n)?.total_mudas || 0), 0);
                        return Math.min(Math.round((total / 8000) * 100), 100);
                      };
                      const pctA = getVaoPct("A");
                      const pctB = getVaoPct("B");
                      return (
                        <div key={vao} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
                          <span className="text-[11px] font-bold text-center text-muted-foreground bg-muted rounded px-1 py-0.5">V{vao}</span>
                          <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${heatColor(pctA)}`}>
                            <span className="text-xs font-medium">Lado A</span>
                            <span className="text-xs font-bold">{pctA}%</span>
                          </div>
                          <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${heatColor(pctB)}`}>
                            <span className="text-xs font-medium">Lado B</span>
                            <span className="text-xs font-bold">{pctB}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // GRID VIEW (original)
                <>
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border bg-muted/40 border-border" /> Vazio
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border bg-primary/10 border-primary/30" /> Com mudas
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border bg-primary/30 border-primary/50" /> &gt;80% cheio
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 rounded bg-amber-400/50" /> Colhido
                </div>
                <span className="text-muted-foreground/60">Clique para editar</span>
              </div>

              {/* Greenhouse layout */}
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_40px_1fr] gap-2 mb-2">
                    <div className="text-center">
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-xs">
                        Lado A — {vaosPerLado} meio-vãos
                      </Badge>
                    </div>
                    <div />
                    <div className="text-center">
                      <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground text-xs">
                        Lado B — {vaosPerLado} meio-vãos
                      </Badge>
                    </div>
                  </div>

                  {/* Canteiro columns header */}
                  <div className="grid grid-cols-[1fr_40px_1fr] gap-2 mb-1 text-[10px] text-muted-foreground">
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <span>C1</span><span>C2</span><span>C3</span><span>C4</span>
                    </div>
                    <div />
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <span>C1</span><span>C2</span><span>C3</span><span>C4</span>
                    </div>
                  </div>

                  {/* Rows */}
                   <TooltipProvider delayDuration={200}>
                   <div className="space-y-1">
                     {Array.from({ length: vaosPerLado }, (_, i) => i + 1).map((vao) => (
                      <div key={vao} className="grid grid-cols-[1fr_40px_1fr] gap-2 items-center">
                        {/* Lado A */}
                        <div className={`grid grid-cols-4 gap-1 p-1.5 rounded-lg border ${LADO_COLORS.A}`}>
                          {[1, 2, 3, 4].map((num) => (
                            <MiniCanteiro
                              key={num}
                              canteiro={getCanteiro(estufa, "A", vao, num)}
                              onClick={openEdit}
                              numero={num}
                              colheitas={getColheitas(estufa, "A", vao, num)}
                            />
                          ))}
                        </div>

                        {/* Vão number (center corridor) */}
                        <div className="flex items-center justify-center">
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1 py-0.5">
                            {vao}
                          </span>
                        </div>

                        {/* Lado B */}
                        <div className={`grid grid-cols-4 gap-1 p-1.5 rounded-lg border ${LADO_COLORS.B}`}>
                          {[1, 2, 3, 4].map((num) => (
                            <MiniCanteiro
                              key={num}
                              canteiro={getCanteiro(estufa, "B", vao, num)}
                              onClick={openEdit}
                              numero={num}
                              colheitas={getColheitas(estufa, "B", vao, num)}
                            />
                          ))}
                        </div>
                        </div>
                        ))}
                        </div>
                        </TooltipProvider>
                        </div>
                        </div>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <CanteiroDialog
        canteiro={selectedCanteiro}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadCanteiros}
      />
    </div>
  );
}