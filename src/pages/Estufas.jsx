import { useState, useEffect } from "react";
import { canteirosAPI, colheitasAPI, plantiosAPI } from "@/api/supabaseClient";
import { Warehouse } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ESTUFA_VAOS, TOTAL_VAOS } from "@/lib/estufasConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CanteiroDialog, { isFixo } from "../components/CanteiroDialog";

const LADO_COLORS = { A: "bg-primary/10 border-primary/30", B: "bg-accent/10 border-accent/30" };
const CANTEIRO_EMPTY = "bg-muted/40 border-border hover:bg-muted/70 text-muted-foreground";
const CANTEIRO_PARTIAL = "bg-primary/5 border-primary/20 hover:bg-primary/10";
const CANTEIRO_FULL = "bg-primary/20 border-primary/40 hover:bg-primary/30";
// Cores para flores fixas (Statice = roxo, Limonium = azul)
const CANTEIRO_STATICE = "bg-purple-100 border-purple-300 hover:bg-purple-200 text-purple-700";
const CANTEIRO_LIMONIUM = "bg-blue-100 border-blue-300 hover:bg-blue-200 text-blue-700";

function MiniCanteiro({ canteiro, onClick, numero, colheitas }) {
  const mudas = canteiro?.total_mudas || 0;
  const pct = Math.min((mudas / 2000) * 100, 100);
  const variedades = canteiro?.variedades || [];
  const fixo = isFixo(canteiro);

  // Determinar cor do canteiro
  let colorClass;
  if (!canteiro || variedades.length === 0) {
    colorClass = CANTEIRO_EMPTY;
  } else if (fixo) {
    // Statice = Lado A (roxo), Limonium = Lado B (azul)
    colorClass = canteiro.lado === 'A' ? CANTEIRO_STATICE : CANTEIRO_LIMONIUM;
  } else {
    colorClass = pct >= 80 ? CANTEIRO_FULL : CANTEIRO_PARTIAL;
  }

  const totalHastes = colheitas?.reduce((s, c) => s + (c.hastes || c.pressas || 0), 0) || 0;
  const totalCestos = colheitas?.reduce((s, c) => s + (c.cestos || 0), 0) || 0;
  const colheitaPct = !fixo && mudas > 0 ? Math.min((totalHastes / mudas) * 100, 100) : 0;

  const btn = (
    <button
      onClick={() => canteiro && onClick(canteiro)}
      className={`relative w-full h-7 sm:h-10 rounded border text-xs font-medium transition-all ${colorClass} overflow-hidden`}
    >
      {!fixo && pct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-primary/30 transition-all" style={{ height: `${pct}%` }} />
      )}
      {!fixo && colheitaPct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-amber-400/50 transition-all" style={{ height: `${colheitaPct}%` }} />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <span className="text-[10px]">{numero}</span>
        {!fixo && colheitaPct > 0 && mudas > 0 && (
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
        <p className="font-semibold text-xs mb-1">
          Canteiro {numero} {fixo ? '— Flor de Corte Fixa' : `— ${mudas} mudas`}
        </p>
        {variedades.map((v, i) => (
          <p key={i} className="text-xs">{(v.nome || v.variedade)}{!fixo && `: `}{!fixo && <span className="font-medium">{v.quantidade}</span>}</p>
        ))}
        {totalHastes > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-border">
            <p className="text-xs text-amber-600 font-medium">🌸 Colhido: {totalHastes} hastes{totalCestos > 0 ? ` (${totalCestos} cestos)` : ''}</p>
            {!fixo && <p className="text-[10px] text-muted-foreground mt-0.5">{colheitaPct.toFixed(0)}% de {mudas} mudas</p>}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Estufas() {
  const [canteiros, setCanteiros] = useState([]);
  const [colheitas, setColheitas] = useState([]);
  const [plantios, setPlantios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanteiro, setSelectedCanteiro] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadCanteiros() {
    try {
      const [data, cols, plas] = await Promise.all([
        canteirosAPI.list(),
        colheitasAPI.list(),
        plantiosAPI.list(1000),
      ]);
      setCanteiros(data);
      setColheitas(cols);
      setPlantios(plas);
    } catch (e) {
      console.warn('loadCanteiros error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCanteiros(); }, []);

  function getCanteiro(estufa, lado, vao, numero) {
    return canteiros.find(
      (c) => c.estufa === estufa && c.lado === lado && c.vao === vao && c.numero === numero
    ) || null;
  }

  function getColheitas(estufa, lado, vao, numero) {
    // Encontrar a data do plantio mais recente deste canteiro (ciclo atual)
    const plantiosCanteiro = plantios.filter(
      (p) => p.estufa === estufa && p.lado === lado && p.vao === vao && p.canteiro === numero
    );
    let dataInicioCiclo = null;
    if (plantiosCanteiro.length > 0) {
      const sorted = [...plantiosCanteiro].sort((a, b) => new Date(b.data_plantio) - new Date(a.data_plantio));
      dataInicioCiclo = sorted[0].data_plantio;
    }
    // Retornar apenas colheitas do ciclo atual
    return colheitas.filter(
      (c) => c.estufa === estufa && c.lado === lado && c.vao === vao && c.canteiro === numero &&
        (!dataInicioCiclo || (c.data_colheita && c.data_colheita >= dataInicioCiclo))
    );
  }

  function openEdit(canteiro) {
    setSelectedCanteiro(canteiro);
    setDialogOpen(true);
  }

  function getEstufaStats(estufa) {
    const ecs = canteiros.filter((c) => c.estufa === estufa);
    const comMudas = ecs.filter((c) => (c.total_mudas || 0) > 0).length;
    const totalMudas = ecs.reduce((s, c) => s + (c.total_mudas || 0), 0);
    return { comMudas, totalMudas };
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
          <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Estufas</h1>
        </div>
        <p className="text-muted-foreground hidden sm:block">Layout completo — cada vão tem 4 canteiros por lado</p>
      </div>

      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {[1, 2, 3, 4].map((n) => {
            const s = getEstufaStats(n);
            const totalPossivel = TOTAL_VAOS[n] * 2 * 4;
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

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border bg-muted/40 border-border" /> Vazio
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border bg-primary/10 border-primary/30" /> Com mudas
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border bg-primary/30 border-primary/50" /> &gt;80% cheio
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 sm:h-4 rounded bg-amber-400/50" /> Colhido
                </div>
                {estufa === 2 && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border bg-purple-100 border-purple-300" /> Statice (Lado A)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border bg-blue-100 border-blue-300" /> Limonium (Lado B)
                    </div>
                  </>
                )}
                <span className="text-muted-foreground/60 hidden sm:inline">Clique para editar</span>
              </div>

              {/* Greenhouse layout */}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="min-w-[320px]">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_28px_1fr] sm:grid-cols-[1fr_40px_1fr] gap-1 sm:gap-2 mb-2">
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
                  <div className="grid grid-cols-[1fr_28px_1fr] sm:grid-cols-[1fr_40px_1fr] gap-1 sm:gap-2 mb-1 text-[10px] text-muted-foreground">
                    <div className="grid grid-cols-4 gap-0.5 sm:gap-1 text-center">
                      <span>C1</span><span>C2</span><span>C3</span><span>C4</span>
                    </div>
                    <div />
                    <div className="grid grid-cols-4 gap-0.5 sm:gap-1 text-center">
                      <span>C1</span><span>C2</span><span>C3</span><span>C4</span>
                    </div>
                  </div>

                  {/* Rows */}
                  <TooltipProvider delayDuration={200}>
                    <div className="space-y-1">
                      {Array.from({ length: vaosPerLado }, (_, i) => i + 1).map((vao) => (
                        <div key={vao} className="grid grid-cols-[1fr_28px_1fr] sm:grid-cols-[1fr_40px_1fr] gap-1 sm:gap-2 items-center">
                          {/* Lado A */}
                          <div className={`grid grid-cols-4 gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-lg border ${LADO_COLORS.A}`}>
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

                          {/* Vão number */}
                          <div className="flex items-center justify-center">
                            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground bg-muted rounded px-0.5 sm:px-1 py-0.5">
                              {vao}
                            </span>
                          </div>

                          {/* Lado B */}
                          <div className={`grid grid-cols-4 gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-lg border ${LADO_COLORS.B}`}>
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