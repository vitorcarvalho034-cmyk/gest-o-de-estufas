import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Archive, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
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

export default function CanteiroDialog({ canteiro, open, onClose, onSaved }) {
  const [variedades, setVariedades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plantioData, setPlantioData] = useState(null); // earliest plantio date
  const [colheitaTotal, setColheitaTotal] = useState({ hastes: 0, cestos: 0 });
  const [showDescarte, setShowDescarte] = useState(false);
  const [descarteForm, setDescarteForm] = useState({ variedade: "", quantidade: "", motivo: "Qualidade", observacao: "" });
  const [descarteTotal, setDescarteTotal] = useState(0);
  const [showFinalizarConfirm, setShowFinalizarConfirm] = useState(false);
  const [obsFinalizacao, setObsFinalizacao] = useState("");
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (canteiro && open) {
      setVariedades(canteiro.variedades || []);
      setShowFinalizarConfirm(false);
      setObsFinalizacao("");
      setTab("info");
      loadData();
    }
  }, [canteiro, open]);

  async function loadData() {
    if (!canteiro) return;
    setLoading(true);
    const [plantios, colheitas, descartes] = await Promise.all([
      base44.entities.Plantio.filter({ estufa: canteiro.estufa, lado: canteiro.lado, vao: canteiro.vao, canteiro: canteiro.numero }),
      base44.entities.Colheita.filter({ estufa: canteiro.estufa, lado: canteiro.lado, vao: canteiro.vao, canteiro: canteiro.numero }),
      base44.entities.Descarte.filter({ estufa: canteiro.estufa, lado: canteiro.lado, vao: canteiro.vao, canteiro: canteiro.numero }),
    ]);

    // Earliest plantio date
    if (plantios.length > 0) {
      const sorted = [...plantios].sort((a, b) => new Date(a.data_plantio) - new Date(b.data_plantio));
      setPlantioData(sorted[0].data_plantio);
    } else {
      setPlantioData(null);
    }

    setColheitaTotal({
      hastes: colheitas.reduce((s, c) => s + (c.pressas || 0), 0),
      cestos: colheitas.reduce((s, c) => s + (c.cestos || 0), 0),
    });
    setDescarteTotal(descartes.reduce((s, d) => s + (d.quantidade || 0), 0));
    setLoading(false);
  }

  const total = variedades.reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);

  // Computed dates
  const dataCorteLuz = plantioData ? moment(plantioData).add(25, "days").format("DD/MM/YYYY") : "—";
  const dataPrevisaoColheita = plantioData ? moment(plantioData).add(12, "weeks").format("DD/MM/YYYY") : "—";
  const diasDesdeP = plantioData ? moment().diff(moment(plantioData), "days") : null;

  function addVariedade() {
    if (variedades.length >= 4) { toast.error("Máximo 4 variedades por canteiro"); return; }
    setVariedades([...variedades, { nome: "", quantidade: 0 }]);
  }

  function removeVariedade(index) {
    setVariedades(variedades.filter((_, i) => i !== index));
  }

  function updateVariedade(index, field, value) {
    const updated = [...variedades];
    updated[index] = { ...updated[index], [field]: field === "quantidade" ? parseInt(value) || 0 : value };
    setVariedades(updated);
  }

  async function save() {
    if (total > 2000) { toast.error("Total não pode ultrapassar 2000 mudas"); return; }
    const filtered = variedades.filter((v) => v.nome.trim() !== "");
    setSaving(true);
    await base44.entities.Canteiro.update(canteiro.id, {
      variedades: filtered,
      total_mudas: filtered.reduce((s, v) => s + (v.quantidade || 0), 0),
    });
    toast.success("Canteiro atualizado");
    setSaving(false);
    onSaved();
    onClose();
  }

  async function finalizarVao() {
    setSaving(true);
    // Archive to HistoricoVao
    await base44.entities.HistoricoVao.create({
      estufa: canteiro.estufa,
      lado: canteiro.lado,
      vao: canteiro.vao,
      canteiro: canteiro.numero,
      variedades: canteiro.variedades || [],
      total_mudas: canteiro.total_mudas || 0,
      data_plantio: plantioData || null,
      data_corte_luz: plantioData ? moment(plantioData).add(25, "days").format("YYYY-MM-DD") : null,
      data_previsao_colheita: plantioData ? moment(plantioData).add(12, "weeks").format("YYYY-MM-DD") : null,
      total_colhido_pressas: colheitaTotal.hastes,
      total_colhido_cestos: colheitaTotal.cestos,
      total_descartado: descarteTotal,
      data_finalizacao: moment().format("YYYY-MM-DD"),
      observacao: obsFinalizacao,
    });

    // Clear the canteiro
    await base44.entities.Canteiro.update(canteiro.id, { variedades: [], total_mudas: 0 });

    toast.success("Vão finalizado e arquivado! Canteiro liberado para novo plantio.");
    setSaving(false);
    setShowFinalizarConfirm(false);
    onSaved();
    onClose();
  }

  if (!canteiro) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Estufa {canteiro.estufa} — Lado {canteiro.lado} — Vão {canteiro.vao} — Canteiro {canteiro.numero}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : showFinalizarConfirm ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Finalizar e arquivar este vão</p>
                <p className="text-muted-foreground mt-1">Isso irá salvar o histórico completo e liberar o canteiro para um novo plantio.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação (opcional)</Label>
              <Input placeholder="Ex: Colheita finalizada, qualidade boa" value={obsFinalizacao} onChange={(e) => setObsFinalizacao(e.target.value)} />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
              <p><span className="text-muted-foreground">Total colhido:</span> <span className="font-semibold">{colheitaTotal.hastes} hastes / {colheitaTotal.cestos} cestos</span></p>
              <p><span className="text-muted-foreground">Total descartado:</span> <span className="font-semibold">{descarteTotal} mudas</span></p>
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
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="editar">Editar Mudas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 pt-3">
              {/* Datas */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ciclo de Cultivo</p>
                <InfoRow label="📅 Data de Plantio" value={plantioData ? moment(plantioData).format("DD/MM/YYYY") : "—"} />
                <InfoRow label="✂️ Corte de Luz (25 dias)" value={dataCorteLuz} highlight={diasDesdeP !== null && diasDesdeP >= 23 && diasDesdeP <= 27} />
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
                    <InfoRow key={i} label={v.nome} value={`${v.quantidade} mudas`} />
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

              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => setShowFinalizarConfirm(true)}
              >
                <Archive className="w-4 h-4 mr-2" /> Finalizar e Liberar Canteiro
              </Button>
            </TabsContent>

            <TabsContent value="editar" className="space-y-4 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Variedades</Label>
                <span className={`text-sm font-semibold ${total > 2000 ? "text-destructive" : "text-primary"}`}>
                  {total}/2000 mudas
                </span>
              </div>
              <div className="space-y-3">
                {variedades.map((v, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Variedade"
                      value={v.nome}
                      onChange={(e) => updateVariedade(i, "nome", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qtd"
                      value={v.quantidade || ""}
                      onChange={(e) => updateVariedade(i, "quantidade", e.target.value)}
                      className="w-24"
                      min={0}
                      max={2000}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeVariedade(i)} className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addVariedade} disabled={variedades.length >= 4} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Variedade
              </Button>

              {/* Descarte rápido */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Registrar Descarte</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowDescarte(!showDescarte)} className="text-xs h-7">
                    {showDescarte ? "Ocultar" : "+ Descarte"}
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
                        await base44.entities.Descarte.create({
                          estufa: canteiro.estufa,
                          lado: canteiro.lado,
                          vao: canteiro.vao,
                          canteiro: canteiro.numero,
                          variedade: descarteForm.variedade,
                          quantidade: parseInt(descarteForm.quantidade),
                          motivo: descarteForm.motivo,
                          observacao: descarteForm.observacao,
                          data_descarte: new Date().toISOString().split("T")[0],
                        });
                        toast.success("Descarte registrado!");
                        setDescarteForm({ variedade: "", quantidade: "", motivo: "Qualidade", observacao: "" });
                        setShowDescarte(false);
                        await loadData();
                        setSaving(false);
                      }}
                    >
                      Confirmar Descarte
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={save} disabled={saving || total > 2000}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}