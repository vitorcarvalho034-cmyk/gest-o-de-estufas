import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Archive, AlertTriangle, Leaf, Scissors } from "lucide-react";
import { canteirosAPI, colheitasAPI, descartesAPI, plantiosAPI } from "@/api/supabaseClient";
import { enqueue } from "@/lib/offlineQueue";
import { toast } from "sonner";
import moment from "moment";

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

// Detecta se o canteiro é de cultura fixa (Statice ou Limonium)
export function isFixo(canteiro) {
  if (!canteiro) return false;
  if (canteiro.tipo_cultura === 'fixo') return true;
  // Fallback: Estufa 2 tem Statice (Lado A) e Limonium (Lado B)
  if (canteiro.estufa === 2 && (canteiro.lado === 'A' || canteiro.lado === 'B')) {
    const variedades = canteiro.variedades || [];
    const nomes = variedades.map(v => (v.nome || v.variedade || '').toLowerCase());
    const isStaticeOrLimonium = nomes.some(n =>
      n.includes('sinzii') || n.includes('tasmania') || n.includes('statice') ||
      n.includes('klara') || n.includes('piuma') || n.includes('shooting') ||
      n.includes('oshi') || n.includes('supreme') || n.includes('limonium')
    );
    if (isStaticeOrLimonium) return true;
  }
  return false;
}

export default function CanteiroDialog({ canteiro, open, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plantioData, setPlantioData] = useState(null);
  const [colheitaTotal, setColheitaTotal] = useState({ hastes: 0, cestos: 0 });
  const [showDescarte, setShowDescarte] = useState(false);
  const [descarteForm, setDescarteForm] = useState({ variedade: "", quantidade: "", motivo: "Qualidade", observacao: "" });
  const [descarteTotal, setDescarteTotal] = useState(0);
  const [showFinalizarConfirm, setShowFinalizarConfirm] = useState(false);
  const [obsFinalizacao, setObsFinalizacao] = useState("");

  const fixo = isFixo(canteiro);

  useEffect(() => {
    if (canteiro && open) {
      setShowFinalizarConfirm(false);
      setObsFinalizacao("");
      setShowDescarte(false);
      loadData();
    }
  }, [canteiro, open]);

  async function loadData() {
    if (!canteiro) return;
    setLoading(true);
    const loc = { estufa: canteiro.estufa, lado: canteiro.lado, vao: canteiro.vao, canteiro: canteiro.numero };
    const [plantios, colheitas, descartes] = await Promise.all([
      plantiosAPI.list(1000),
      colheitasAPI.list(1000),
      descartesAPI.list(1000),
    ]);

    const filterFn = (item) =>
      item.estufa === loc.estufa &&
      item.lado === loc.lado &&
      item.vao === loc.vao &&
      (item.canteiro === loc.canteiro || item.numero === loc.canteiro);

    const filteredPlantios = plantios.filter(filterFn);

    // Pegar o plantio MAIS RECENTE para definir o início do ciclo atual
    let dataInicioCiclo = null;
    if (filteredPlantios.length > 0) {
      const sorted = [...filteredPlantios].sort((a, b) => new Date(b.data_plantio) - new Date(a.data_plantio));
      dataInicioCiclo = sorted[0].data_plantio;
      setPlantioData(dataInicioCiclo);
    } else {
      setPlantioData(null);
    }

    // Filtrar colheitas e descartes APENAS do ciclo atual (a partir do plantio mais recente)
    const filteredColheitas = colheitas.filter(c =>
      filterFn(c) &&
      (!dataInicioCiclo || (c.data_colheita && c.data_colheita >= dataInicioCiclo))
    );
    const filteredDescartes = descartes.filter(d =>
      filterFn(d) &&
      (!dataInicioCiclo || (d.data_descarte && d.data_descarte >= dataInicioCiclo))
    );

    setColheitaTotal({
      hastes: filteredColheitas.reduce((s, c) => s + (c.pressas || 0), 0),
      cestos: filteredColheitas.reduce((s, c) => s + (c.cestos || 0), 0),
    });
    setDescarteTotal(filteredDescartes.reduce((s, d) => s + (d.quantidade || 0), 0));
    setLoading(false);
  }

  // Computed dates (apenas para ciclo)
  const dataCorteLuz = plantioData ? moment(plantioData).add(25, "days").format("DD/MM/YYYY") : "—";
  const dataPrevisaoColheita = plantioData ? moment(plantioData).add(12, "weeks").format("DD/MM/YYYY") : "—";
  const diasDesdeP = plantioData ? moment().diff(moment(plantioData), "days") : null;

  async function finalizarVao() {
    setSaving(true);
    try {
      const historicoPayload = {
        variedades: [],
        total_mudas: 0,
        data_finalizacao: new Date().toISOString().split("T")[0],
        data_plantio_ultimo: plantioData || null,
        data_corte_luz_ultimo: plantioData ? moment(plantioData).add(25, "days").toISOString().split("T")[0] : null,
        data_previsao_colheita_ultimo: plantioData ? moment(plantioData).add(12, "weeks").toISOString().split("T")[0] : null,
        total_colhido_cestos: colheitaTotal.cestos,
        total_colhido_pressas: colheitaTotal.hastes,
        total_descartado: descarteTotal,
        variedades_ultimo_ciclo: canteiro.variedades || [],
        observacao_finalizacao: obsFinalizacao || null,
      };

      if (!navigator.onLine) {
        enqueue('Canteiro', { _action: 'update', id: canteiro.id, ...historicoPayload });
        window.dispatchEvent(new Event('offline-queue-updated'));
        toast.warning("Sem conexão — finalização salva na fila. Será sincronizada quando houver internet.", { duration: 5000 });
        setSaving(false);
        setShowFinalizarConfirm(false);
        onSaved();
        onClose();
        return;
      }

      await canteirosAPI.update(canteiro.id, historicoPayload);
      toast.success("✅ Vão finalizado! Histórico salvo e canteiro liberado para novo plantio.");
      setSaving(false);
      setShowFinalizarConfirm(false);
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Erro ao finalizar: " + (err.message || "tente novamente"));
      setSaving(false);
    }
  }

  if (!canteiro) return null;

  // ── Tipo da cultura no título ──────────────────────────────────────────────
  const tipoBadge = fixo
    ? <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"><Leaf className="w-3 h-3 mr-1" />Flor de Corte Fixa</Badge>
    : <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200 text-[10px]"><Scissors className="w-3 h-3 mr-1" />Ciclo</Badge>;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-base flex items-center flex-wrap gap-1">
            Estufa {canteiro.estufa} — Lado {canteiro.lado} — Vão {canteiro.vao} — Canteiro {canteiro.numero}
            {tipoBadge}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : showFinalizarConfirm ? (
          // ── Tela de confirmação de finalização (apenas para ciclo) ──────────
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Finalizar e arquivar este vão</p>
                <p className="text-muted-foreground mt-1">O histórico completo será salvo e o canteiro ficará livre para um novo plantio.</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-muted-foreground uppercase text-[10px] mb-2">Resumo do Ciclo</p>
              {(canteiro.variedades || []).map((v, i) => (
                <p key={i}><span className="text-muted-foreground">{v.nome || v.variedade}:</span> <span className="font-semibold">{v.quantidade} mudas</span></p>
              ))}
              <div className="border-t border-border/50 pt-1.5 mt-1.5 space-y-1">
                <p><span className="text-muted-foreground">Plantio:</span> <span className="font-semibold">{plantioData ? moment(plantioData).format("DD/MM/YYYY") : "—"}</span></p>
                <p><span className="text-muted-foreground">Total colhido:</span> <span className="font-semibold text-primary">{colheitaTotal.hastes} hastes / {colheitaTotal.cestos} cestos</span></p>
                <p><span className="text-muted-foreground">Total descartado:</span> <span className="font-semibold text-destructive">{descarteTotal} mudas</span></p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observação (opcional)</Label>
              <Input
                placeholder="Ex: Colheita finalizada, qualidade boa"
                value={obsFinalizacao}
                onChange={(e) => setObsFinalizacao(e.target.value)}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFinalizarConfirm(false)}>Voltar</Button>
              <Button variant="destructive" onClick={finalizarVao} disabled={saving}>
                <Archive className="w-4 h-4 mr-1" />
                {saving ? "Arquivando..." : "Confirmar Finalização"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-4 pt-1">

              {/* Banner de cultura fixa */}
              {fixo && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Leaf className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-700">
                    <p className="font-semibold">Flor de Corte Fixa — produção contínua</p>
                    <p className="mt-0.5 text-emerald-600">Este canteiro não precisa ser finalizado. A colheita é registrada em hastes semanalmente.</p>
                  </div>
                </div>
              )}

              {/* Histórico do último ciclo finalizado (apenas ciclo) */}
              {!fixo && canteiro.data_finalizacao && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-0.5">
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-2">📦 Último Ciclo Finalizado em {moment(canteiro.data_finalizacao).format("DD/MM/YYYY")}</p>
                  {(canteiro.variedades_ultimo_ciclo || []).map((v, i) => (
                    <InfoRow key={i} label={v.nome || v.variedade} value={`${v.quantidade} mudas`} />
                  ))}
                  {canteiro.total_colhido_pressas > 0 && (
                    <InfoRow label="🌸 Colhido" value={`${canteiro.total_colhido_pressas} hastes / ${canteiro.total_colhido_cestos} cestos`} highlight />
                  )}
                  {canteiro.total_descartado > 0 && (
                    <InfoRow label="🗑 Descartado" value={`${canteiro.total_descartado} mudas`} />
                  )}
                  {canteiro.observacao_finalizacao && (
                    <p className="text-xs text-amber-600 mt-1 italic">"{canteiro.observacao_finalizacao}"</p>
                  )}
                </div>
              )}

              {/* Conteúdo principal */}
              {(canteiro.total_mudas || 0) > 0 || fixo ? (
                <>
                  {/* Para cultura fixa: mostrar variedades e colheita acumulada */}
                  {fixo ? (
                    <>
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Variedades Plantadas</p>
                        {(canteiro.variedades || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Nenhuma variedade cadastrada</p>
                        ) : (
                          canteiro.variedades.map((v, i) => (
                            <InfoRow key={i} label={v.nome || v.variedade} value={`Vão ${canteiro.vao}`} />
                          ))
                        )}
                      </div>

                      <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Produção Acumulada (Hastes)</p>
                        <InfoRow label="✂️ Hastes colhidas" value={colheitaTotal.hastes} highlight={colheitaTotal.hastes > 0} />
                        {colheitaTotal.cestos > 0 && (
                          <InfoRow label="🧺 Cestos" value={colheitaTotal.cestos} />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Datas do ciclo (apenas para ciclo) */}
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ciclo de Cultivo</p>
                        <InfoRow label="📅 Data de Plantio" value={plantioData ? moment(plantioData).format("DD/MM/YYYY") : "—"} />
                        <InfoRow
                          label="✂️ Corte de Luz (25 dias)"
                          value={dataCorteLuz}
                          highlight={diasDesdeP !== null && diasDesdeP >= 23 && diasDesdeP <= 27}
                        />
                        <InfoRow label="🌸 Previsão de Colheita (12 sem.)" value={dataPrevisaoColheita} highlight />
                        {diasDesdeP !== null && (
                          <InfoRow label="⏱ Dias desde plantio" value={`${diasDesdeP} dias`} />
                        )}
                      </div>

                      {/* Variedades */}
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Variedades Plantadas</p>
                        {(canteiro.variedades || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Nenhuma variedade</p>
                        ) : (
                          canteiro.variedades.map((v, i) => (
                            <InfoRow key={i} label={v.nome || v.variedade} value={`${v.quantidade} mudas`} />
                          ))
                        )}
                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="text-sm font-bold text-primary">{canteiro.total_mudas || 0} / 2000</span>
                        </div>
                      </div>

                      {/* Colheita e Descarte */}
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Produção Acumulada</p>
                        <InfoRow label="🧺 Cestos colhidos" value={colheitaTotal.cestos} />
                        <InfoRow label="🌿 Hastes colhidas" value={colheitaTotal.hastes} highlight={colheitaTotal.hastes > 0} />
                        <InfoRow label="🗑 Mudas descartadas" value={descarteTotal} />
                      </div>

                      {/* Produtividade (apenas ciclo) */}
                      {(canteiro.total_mudas || 0) > 0 && (
                        <div className="rounded-lg border bg-gradient-to-br from-accent/10 to-primary/5 p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">📊 Produtividade do Canteiro</p>
                          {(() => {
                            const totalMudas = canteiro.total_mudas || 0;
                            const pctColhida = totalMudas > 0 ? Math.round((colheitaTotal.hastes / totalMudas) * 100) : 0;
                            const pctComDescartes = totalMudas > 0 ? Math.round(((colheitaTotal.hastes + descarteTotal) / totalMudas) * 100) : 0;
                            const pctPerdas = pctComDescartes > pctColhida ? pctComDescartes - pctColhida : 0;
                            return (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Hastes colhidas</span>
                                  <span className="font-bold text-primary">{pctColhida}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pctColhida, 100)}%` }} />
                                </div>
                                {pctPerdas > 0 && (
                                  <div className="text-xs text-muted-foreground text-right">
                                    {pctPerdas}% com descartes
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Mortalidade de Mudas (apenas ciclo) */}
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Mortalidade de Mudas</Label>
                          <Button variant="ghost" size="sm" onClick={() => setShowDescarte(!showDescarte)} className="text-xs h-7">
                            {showDescarte ? "Ocultar" : "+ Registrar"}
                          </Button>
                        </div>
                        {showDescarte && (
                          <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                            <Input
                              placeholder="Variedade"
                              value={descarteForm.variedade}
                              onChange={(e) => setDescarteForm({ ...descarteForm, variedade: e.target.value })}
                            />
                            <Input
                              type="number"
                              placeholder="Quantidade de mudas"
                              value={descarteForm.quantidade}
                              onChange={(e) => setDescarteForm({ ...descarteForm, quantidade: e.target.value })}
                            />
                            <select
                              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                              value={descarteForm.motivo}
                              onChange={(e) => setDescarteForm({ ...descarteForm, motivo: e.target.value })}
                            >
                              {["Doença", "Praga", "Qualidade", "Excesso", "Outro"].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <Input
                              placeholder="Observação (opcional)"
                              value={descarteForm.observacao}
                              onChange={(e) => setDescarteForm({ ...descarteForm, observacao: e.target.value })}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              disabled={saving || !descarteForm.variedade || !descarteForm.quantidade}
                              onClick={async () => {
                                setSaving(true);
                                const qtd = parseInt(descarteForm.quantidade);
                                await descartesAPI.create({
                                  estufa: canteiro.estufa,
                                  lado: canteiro.lado,
                                  vao: canteiro.vao,
                                  canteiro: canteiro.numero,
                                  variedade: descarteForm.variedade,
                                  quantidade: qtd,
                                  motivo: descarteForm.motivo,
                                  observacao: descarteForm.observacao,
                                  data_descarte: new Date().toISOString().split("T")[0],
                                });
                                const novasVarEdades = (canteiro.variedades || []).map((v) =>
                                  (v.nome || v.variedade) === descarteForm.variedade
                                    ? { ...v, quantidade: Math.max(0, v.quantidade - qtd) }
                                    : v
                                );
                                const novoTotal = novasVarEdades.reduce((s, v) => s + v.quantidade, 0);
                                await canteirosAPI.update(canteiro.id, {
                                  variedades: novasVarEdades,
                                  total_mudas: novoTotal,
                                });
                                canteiro.variedades = novasVarEdades;
                                canteiro.total_mudas = novoTotal;
                                toast.success("Mortalidade registrada e estoque atualizado!");
                                setDescarteForm({ variedade: "", quantidade: "", motivo: "Qualidade", observacao: "" });
                                setShowDescarte(false);
                                await loadData();
                                setSaving(false);
                              }}
                            >
                              Confirmar Mortalidade
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Botão Finalizar (apenas ciclo) */}
                      <Button
                        variant="outline"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                        onClick={() => setShowFinalizarConfirm(true)}
                      >
                        <Archive className="w-4 h-4 mr-2" /> Finalizar e Liberar Canteiro
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Este canteiro está vazio.</p>
                  <p className="text-xs mt-1">Registre um plantio para começar.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
