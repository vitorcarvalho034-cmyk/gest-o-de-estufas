import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Plus, AlertTriangle, Bug, Leaf, Scale, MoreHorizontal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";

const MOTIVOS = [
  { label: "Doença", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { label: "Praga", icon: Bug, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { label: "Qualidade", icon: Leaf, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { label: "Excesso", icon: Scale, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { label: "Outro", icon: MoreHorizontal, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
];

const MOTIVO_MAP = Object.fromEntries(MOTIVOS.map((m) => [m.label, m]));

export default function Descarte() {
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroMotivo, setFiltroMotivo] = useState("todos");
  const [variedadesDisponiveis, setVariedadesDisponiveis] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    estufa: "", lado: "", vao: "", canteiro: "",
    variedade: "", quantidade: "", motivo: "", observacao: "",
    data_descarte: new Date().toISOString().split("T")[0],
  });

  async function loadDescartes() {
    const data = await base44.entities.Descarte.list("-data_descarte", 100);
    setDescartes(data);
    setLoading(false);
  }

  useEffect(() => { loadDescartes(); }, []);

  useEffect(() => {
    if (form.estufa && form.lado && form.vao && form.canteiro) {
      base44.entities.Canteiro.filter({
        estufa: parseInt(form.estufa),
        lado: form.lado,
        vao: parseInt(form.vao),
        numero: parseInt(form.canteiro),
      }).then((list) => {
        if (list.length > 0 && list[0].variedades) {
          setVariedadesDisponiveis(list[0].variedades.map((v) => v.nome));
        } else {
          setVariedadesDisponiveis([]);
        }
      });
    } else {
      setVariedadesDisponiveis([]);
    }
  }, [form.estufa, form.lado, form.vao, form.canteiro]);

  function updateForm(field, value) {
    if (field === "estufa") setForm((f) => ({ ...f, estufa: value, lado: "", vao: "", canteiro: "", variedade: "" }));
    else if (field === "lado") setForm((f) => ({ ...f, lado: value, vao: "", canteiro: "", variedade: "" }));
    else if (field === "vao") setForm((f) => ({ ...f, vao: value, canteiro: "", variedade: "" }));
    else setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.estufa || !form.lado || !form.vao || !form.canteiro || !form.variedade || !form.quantidade || !form.motivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    await base44.entities.Descarte.create({
      estufa: parseInt(form.estufa),
      lado: form.lado,
      vao: parseInt(form.vao),
      canteiro: parseInt(form.canteiro),
      variedade: form.variedade,
      quantidade: parseInt(form.quantidade),
      motivo: form.motivo,
      observacao: form.observacao,
      data_descarte: form.data_descarte,
    });
    toast.success(`🗑️ ${form.quantidade} mudas descartadas — ${form.motivo}`);
    setSaving(false);
    setDialogOpen(false);
    setForm({ estufa: "", lado: "", vao: "", canteiro: "", variedade: "", quantidade: "", motivo: "", observacao: "", data_descarte: new Date().toISOString().split("T")[0] });
    setVariedadesDisponiveis([]);
    loadDescartes();
  }

  const vaosArray = form.estufa ? getVaosArray(parseInt(form.estufa)) : [];
  const filtrados = filtroMotivo === "todos" ? descartes : descartes.filter((d) => d.motivo === filtroMotivo);
  const totalMudas = filtrados.reduce((s, d) => s + (d.quantidade || 0), 0);

  const byMotivo = MOTIVOS.map((m) => ({
    ...m,
    count: descartes.filter((d) => d.motivo === m.label).reduce((s, d) => s + (d.quantidade || 0), 0),
  }));

  const groupedByDate = filtrados.reduce((acc, d) => {
    const key = d.data_descarte;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-xl">
            <Trash2 className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Descarte</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe mudas descartadas</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} variant="destructive" className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Novo Descarte
        </Button>
      </div>

      {/* Motivo breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {byMotivo.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.label}
              onClick={() => setFiltroMotivo(filtroMotivo === m.label ? "todos" : m.label)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filtroMotivo === m.label ? m.bg + " ring-2 ring-offset-1 ring-current" : "bg-card border-border hover:border-primary/30"
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${m.color}`} />
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold">{m.count.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-muted-foreground">mudas</p>
            </button>
          );
        })}
      </div>

      {/* Filter all */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFiltroMotivo("todos")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
            filtroMotivo === "todos"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground/30"
          }`}
        >
          Todos · {descartes.reduce((s, d) => s + (d.quantidade || 0), 0).toLocaleString("pt-BR")} mudas
        </button>
        {filtroMotivo !== "todos" && (
          <span className="text-sm text-muted-foreground">{totalMudas.toLocaleString("pt-BR")} mudas em {filtrados.length} registros</span>
        )}
      </div>

      {/* Timeline */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum descarte registrado</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const registros = groupedByDate[date];
            const totalDia = registros.reduce((s, d) => s + (d.quantidade || 0), 0);
            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold">{moment(date).format("DD [de] MMMM")}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{totalDia.toLocaleString("pt-BR")} mudas</span>
                </div>
                <div className="grid gap-2">
                  {registros.map((d) => {
                    const mInfo = MOTIVO_MAP[d.motivo] || { icon: MoreHorizontal, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
                    const Icon = mInfo.icon;
                    return (
                      <div key={d.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border hover:border-destructive/30 transition-colors">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${mInfo.bg}`}>
                          <Icon className={`w-4 h-4 ${mInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{d.variedade}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${mInfo.bg} ${mInfo.color}`}>
                              {d.motivo}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            E{d.estufa} {d.lado} · V{d.vao}-C{d.canteiro}
                            {d.observacao && ` · ${d.observacao}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm text-destructive">{d.quantidade?.toLocaleString("pt-BR")}</p>
                          <p className="text-xs text-muted-foreground">mudas</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setVariedadesDisponiveis([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Novo Descarte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Location */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Localização *</Label>
              <div className="grid grid-cols-4 gap-2">
                <Select value={form.estufa} onValueChange={(v) => updateForm("estufa", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Est." /></SelectTrigger>
                  <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>E{n}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.lado} onValueChange={(v) => updateForm("lado", v)} disabled={!form.estufa}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Lado" /></SelectTrigger>
                  <SelectContent>{["A","B"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.vao} onValueChange={(v) => updateForm("vao", v)} disabled={!form.lado}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Vão" /></SelectTrigger>
                  <SelectContent>{vaosArray.map(n => <SelectItem key={n} value={String(n)}>V{n}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.canteiro} onValueChange={(v) => updateForm("canteiro", v)} disabled={!form.vao}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="C." /></SelectTrigger>
                  <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>C{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Variety */}
            <div className="space-y-1.5">
              <Label className="text-xs">Variedade *</Label>
              {variedadesDisponiveis.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {variedadesDisponiveis.map((v) => (
                      <button
                        key={v}
                        onClick={() => updateForm("variedade", v)}
                        className={`px-3 py-1 rounded-full text-xs border font-medium transition-all ${
                          form.variedade === v
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "bg-muted border-border hover:border-destructive/50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Ou digite outra..."
                    value={form.variedade}
                    onChange={(e) => updateForm("variedade", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <Input
                  placeholder="Ex: Anastasia Fuego"
                  value={form.variedade}
                  onChange={(e) => updateForm("variedade", e.target.value)}
                />
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade de Mudas *</Label>
              <Input
                type="number"
                placeholder="Número de mudas"
                value={form.quantidade}
                onChange={(e) => updateForm("quantidade", e.target.value)}
                min={1}
                className="text-center text-lg font-semibold h-11"
              />
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo *</Label>
              <div className="grid grid-cols-3 gap-2">
                {MOTIVOS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.label}
                      onClick={() => updateForm("motivo", m.label)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                        form.motivo === m.label ? m.bg + " ring-2 ring-current" : "bg-background border-border hover:border-primary/30"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${m.color}`} />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <Label className="text-xs">Observação</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={form.observacao}
                onChange={(e) => updateForm("observacao", e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data do Descarte</Label>
              <Input
                type="date"
                value={form.data_descarte}
                onChange={(e) => updateForm("data_descarte", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={saving} className="gap-2">
              <Trash2 className="w-4 h-4" />
              {saving ? "Salvando..." : "Registrar Descarte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}