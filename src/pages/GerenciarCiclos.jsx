import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Calendar, RefreshCw, AlertTriangle } from "lucide-react";
import { plantiosAPI, colheitasAPI, descartesAPI, canteirosAPI, previsaoColheitaAPI } from "@/api/supabaseClient";
import { toast } from "sonner";
import moment from "moment";

export default function GerenciarCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, semana: null, tipo: null });

  useEffect(() => {
    loadCiclos();
  }, []);

  async function loadCiclos() {
    setLoading(true);
    try {
      const plantios = await plantiosAPI.list();
      const colheitas = await colheitasAPI.list();
      const descartes = await descartesAPI.list();

      // Agrupar por semana
      const semanas = new Set();
      plantios.forEach(p => p.semana && semanas.add(p.semana));
      colheitas.forEach(c => c.semana && semanas.add(c.semana));
      descartes.forEach(d => d.semana && semanas.add(d.semana));

      const ciclosArray = Array.from(semanas).sort((a, b) => b - a).map(semana => {
        const plantiosSemana = plantios.filter(p => p.semana === semana);
        const colheitasSemana = colheitas.filter(c => c.semana === semana);
        const descartesSemana = descartes.filter(d => d.semana === semana);

        const totalPlantios = plantiosSemana.reduce((s, p) => s + (p.quantidade || 0), 0);
        const totalColheitas = colheitasSemana.reduce((s, c) => s + (c.cestos || 0) + ((c.hastes ?? c.pressas) || 0), 0);
        const totalDescartes = descartesSemana.reduce((s, d) => s + (d.quantidade || 0), 0);

        // Primeira data de plantio da semana
        const primeiraData = plantiosSemana.length > 0
          ? moment(plantiosSemana[0].data_plantio).format("DD/MM/YYYY")
          : "-";

        return {
          semana,
          primeiraData,
          totalPlantios,
          totalColheitas,
          totalDescartes,
          plantios: plantiosSemana.length,
          colheitas: colheitasSemana.length,
          descartes: descartesSemana.length,
        };
      });

      setCiclos(ciclosArray);
    } catch (error) {
      toast.error(`Erro ao carregar ciclos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleLimparCiclo(semana) {
    setConfirmDialog({ open: true, semana, tipo: "ciclo" });
  }

  async function handleLimparTudo() {
    setConfirmDialog({ open: true, semana: null, tipo: "tudo" });
  }

  async function executarLimpeza() {
    const { semana, tipo } = confirmDialog;
    setConfirmDialog({ open: false, semana: null, tipo: null });

    try {
      if (tipo === "ciclo" && semana) {
        // Limpar apenas um ciclo específico
        const plantios = await plantiosAPI.list();
        const colheitas = await colheitasAPI.list();
        const descartes = await descartesAPI.list();

        for (const p of plantios.filter(p => p.semana === semana)) {
          await plantiosAPI.delete(p.id);
        }
        for (const c of colheitas.filter(c => c.semana === semana)) {
          await colheitasAPI.delete(c.id);
        }
        for (const d of descartes.filter(d => d.semana === semana)) {
          await descartesAPI.delete(d.id);
        }

        toast.success(`Ciclo da semana ${semana} foi limpo com sucesso!`);
      } else if (tipo === "tudo") {
        // Limpar TUDO
        const plantios = await plantiosAPI.list();
        const colheitas = await colheitasAPI.list();
        const descartes = await descartesAPI.list();
        const previsoes = await previsaoColheitaAPI.list();
        const canteiros = await canteirosAPI.list();

        for (const p of plantios) await plantiosAPI.delete(p.id);
        for (const c of colheitas) await colheitasAPI.delete(c.id);
        for (const d of descartes) await descartesAPI.delete(d.id);
        for (const pv of previsoes) await previsaoColheitaAPI.delete(pv.id);

        // Resetar canteiros
        for (const cant of canteiros) {
          await canteirosAPI.update(cant.id, { variedades: [], total_mudas: 0 });
        }

        toast.success("Todos os dados foram limpos com sucesso!");
      }

      loadCiclos();
    } catch (error) {
      toast.error(`Erro ao limpar: ${error.message}`);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Ciclos</h1>
          <p className="text-muted-foreground text-sm">Visualize e limpe ciclos de produção (semanas)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={loadCiclos} disabled={loading} className="flex-1 sm:flex-none">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="destructive" onClick={handleLimparTudo} className="flex-1 sm:flex-none">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando ciclos...</span>
        </div>
      ) : ciclos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum ciclo encontrado. Comece registrando plantios!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ciclos.map((ciclo) => (
            <Card key={ciclo.semana} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Semana {ciclo.semana}
                    </CardTitle>
                    <CardDescription>Primeira data: {ciclo.primeiraData}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLimparCiclo(ciclo.semana)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar Ciclo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Plantios</p>
                    <p className="text-2xl font-bold text-blue-600">{ciclo.totalPlantios.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{ciclo.plantios} registro(s)</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Colheitas</p>
                    <p className="text-2xl font-bold text-green-600">{ciclo.totalColheitas.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{ciclo.colheitas} registro(s)</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Descartes</p>
                    <p className="text-2xl font-bold text-red-600">{ciclo.totalDescartes.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{ciclo.descartes} registro(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, semana: null, tipo: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar Limpeza
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.tipo === "ciclo" ? (
                <>
                  Você está prestes a <strong>excluir permanentemente</strong> todos os dados da <strong>Semana {confirmDialog.semana}</strong>:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Plantios</li>
                    <li>Colheitas</li>
                    <li>Descartes</li>
                  </ul>
                  <p className="mt-3 text-destructive font-semibold">Esta ação não pode ser desfeita!</p>
                </>
              ) : (
                <>
                  Você está prestes a <strong>excluir permanentemente TODOS os dados</strong> do sistema:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Todos os plantios</li>
                    <li>Todas as colheitas</li>
                    <li>Todos os descartes</li>
                    <li>Todas as previsões</li>
                    <li>Todos os canteiros serão zerados</li>
                  </ul>
                  <p className="mt-3 text-destructive font-semibold">Esta ação não pode ser desfeita!</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executarLimpeza} className="bg-destructive hover:bg-destructive/90">
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
