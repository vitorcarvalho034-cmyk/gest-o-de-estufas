import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Warehouse } from "lucide-react";
import { TOTAL_VAOS } from "@/lib/estufasConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CanteiroCard from "../components/CanteiroCard";
import CanteiroDialog from "../components/CanteiroDialog";

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

  useEffect(() => {
    loadCanteiros();
  }, []);

  function getVaos(estufa, lado) {
    const found = canteiros.filter((c) => c.estufa === estufa && c.lado === lado);
    const vaosSet = [...new Set(found.map((c) => c.vao))].sort((a, b) => a - b);
    return vaosSet;
  }

  function getCanteirosByVao(estufa, lado, vao) {
    return canteiros
      .filter((c) => c.estufa === estufa && c.lado === lado && c.vao === vao)
      .sort((a, b) => a.numero - b.numero);
  }

  function openEdit(canteiro) {
    setSelectedCanteiro(canteiro);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Warehouse className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Estufas</h1>
        </div>
        <p className="text-muted-foreground">Gerencie os vãos de cada estufa</p>
      </div>

      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {[1, 2, 3, 4].map((n) => (
            <TabsTrigger key={n} value={String(n)}>Estufa {n}</TabsTrigger>
          ))}
        </TabsList>

        {[1, 2, 3, 4].map((estufa) => (
          <TabsContent key={estufa} value={String(estufa)} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {["A", "B"].map((lado) => (
                <div key={lado} className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${lado === "A" ? "bg-primary" : "bg-accent"}`} />
                    Lado {lado}
                  </h3>
                  <div className="space-y-4">
                    {getVaos(estufa, lado).map((vao) => (
                      <div key={vao} className="rounded-xl border border-border p-3 bg-muted/30 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vão {vao}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {getCanteirosByVao(estufa, lado, vao).map((canteiro) => (
                            <CanteiroCard key={canteiro.id} canteiro={canteiro} onClick={openEdit} />
                          ))}
                          {getCanteirosByVao(estufa, lado, vao).length === 0 && (
                            <p className="text-xs text-muted-foreground italic col-span-4">Sem canteiros cadastrados</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {getVaos(estufa, lado).length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhum vão encontrado</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
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