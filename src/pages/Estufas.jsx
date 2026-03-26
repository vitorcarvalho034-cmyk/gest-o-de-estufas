import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Warehouse } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ESTUFA_VAOS, TOTAL_VAOS } from "@/lib/estufasConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CanteiroDialog from "../components/CanteiroDialog";

const LADO_COLORS = { A: "bg-primary/10 border-primary/30", B: "bg-accent/10 border-accent/30" };
const CANTEIRO_EMPTY = "bg-muted/40 border-border hover:bg-muted/70 text-muted-foreground";
const CANTEIRO_PARTIAL = "bg-primary/5 border-primary/20 hover:bg-primary/10";
const CANTEIRO_FULL = "bg-primary/20 border-primary/40 hover:bg-primary/30";

function MiniCanteiro({ canteiro, onClick, numero }) {
  const mudas = canteiro?.total_mudas || 0;
  const pct = Math.min((mudas / 2000) * 100, 100);
  const colorClass = !canteiro ? CANTEIRO_EMPTY : pct >= 80 ? CANTEIRO_FULL : CANTEIRO_PARTIAL;
  const variedades = canteiro?.variedades || [];

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
      <span className="relative z-10 text-[10px]">{numero}</span>
    </button>
  );

  if (!canteiro || variedades.length === 0) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px]">
        <p className="font-semibold text-xs mb-1">Canteiro {numero} — {mudas} mudas</p>
        {variedades.map((v, i) => (
          <p key={i} className="text-xs">{v.nome}: <span className="font-medium">{v.quantidade}</span></p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Estufas() {
  const [canteiros, setCanteiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCanteiro, setSelectedCanteiro] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadCanteiros() {
    const data = await base44.entities.Canteiro.list();
    setCanteiros(data);
    setLoading(false);
  }

  useEffect(() => { loadCanteiros(); }, []);

  function getCanteiro(estufa, lado, vao, numero) {
    return canteiros.find(
      (c) => c.estufa === estufa && c.lado === lado && c.vao === vao && c.numero === numero
    ) || null;
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

      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {[1, 2, 3, 4].map((n) => (
            <TabsTrigger key={n} value={String(n)}>Estufa {n}</TabsTrigger>
          ))}
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