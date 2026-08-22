import { useState, useEffect } from "react";
import { descartesAPI } from "@/api/supabaseClient";
import { VARIEDADES } from "@/lib/variedades";
import { Trash2, Plus, AlertTriangle, Bug, Leaf, Scale, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";
moment.locale("pt-br");

const MOTIVOS = ["Doença", "Praga", "Qualidade", "Excesso", "Outro"];

const MOTIVO_CONFIG = {
  "Doença":    { icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50",    badge: "bg-red-100 text-red-700" },
  "Praga":     { icon: Bug,           color: "text-orange-500", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  "Qualidade": { icon: Leaf,          color: "text-yellow-500", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700" },
  "Excesso":   { icon: Scale,         color: "text-blue-500",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700" },
  "Outro":     { icon: MoreHorizontal,color: "text-slate-500",  bg: "bg-slate-50",  badge: "bg-slate-100 text-slate-700" },
};

const EMPTY_FORM = {
  variedade: "",
  quantidade: "",
  motivo: "Doença",
  observacao: "",
  estufa: "",
  lado: "",
  vao: "",
  canteiro: "",
  data_descarte: moment().format("YYYY-MM-DD"),
};

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${MOTIVO_CONFIG[label]?.bg || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">mudas</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Descarte() {
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDescarte, setEditingDescarte] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busca, setBusca] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("todos");

  async function loadDescartes() {
    try {
      const data = await descartesAPI.list(1000);
      setDescartes(data || []);
    } catch (e) {
      console.warn("loadDescartes error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDescartes(); }, []);

  const filtrados = descartes.filter((d) => {
    if (filtroMotivo !== "todos" && d.motivo !== filtroMotivo) return false;
    const termo = busca.toLowerCase().trim();
    if (termo && !`${d.variedade || ""} ${d.observacao || ""}`.toLowerCase().includes(termo)) return false;
    return true;
  });

  const groupedByWeek = filtrados.reduce((acc, d) => {
    const date = moment(d.data_descarte);
    const week = date.isoWeek();
    const year = date.year();
    const key = `${year}-W${week}`;
    if (!acc[key]) acc[key] = { week, year, registros: [], total: 0 };
    acc[key].registros.push(d);
    acc[key].total += (d.quantidade || 0);
    return acc;
  }, {});
  
  const sortedWeeks = Object.keys(groupedByWeek).sort((a, b) => b.localeCompare(a));

  const statsByMotivo = MOTIVOS.reduce((acc, m) => {
    acc[m] = descartes.filter(d => d.motivo === m).reduce((s, d) => s + (d.quantidade || 0), 0);
    return acc;
  }, {});
  const totalGeral = descartes.reduce((s, d) => s + (d.quantidade || 0), 0);

  function handleNovo() {
    setEditingDescarte(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function handleEdit(descarte) {
    setEditingDescarte(descarte);
    setForm({
      variedade: descarte.variedade || "",
      quantidade: descarte.quantidade?.toString() || "",
      motivo: descarte.motivo || "Doença",
      observacao: descarte.observacao || "",
      estufa: descarte.estufa?.toString() || "",
      lado: descarte.lado || "",
      vao: descarte.vao?.toString() || "",
      canteiro: descarte.canteiro?.toString() || "",
      data_descarte: descarte.data_descarte || moment().format("YYYY-MM-DD"),
    });
    setDialogOpen(true);
  }

  function handleDelete(id) {
    setDeleteDialog({ open: true, id });
  }

  async function confirmDelete() {
    try {
      await descartesAPI.delete(deleteDialog.id);
      toast.success("Descarte excluído com sucesso!");
      loadDescartes();
    } catch (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  }

  async function handleSave() {
    if (!form.variedade || !form.quantidade || !form.motivo) {
      toast.error("Preencha variedade, quantidade e motivo.");
      return;
    }
    if (form.motivo === "Doença" && !form.observacao.trim()) {
      toast.error("Informe qual é a doença para registrar o descarte.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        variedade: form.variedade,
        quantidade: parseInt(form.quantidade),
        motivo: form.motivo,
        observacao: form.observacao,
        estufa: form.estufa ? parseInt(form.estufa) : null,
        lado: form.lado || null,
        vao: form.vao ? parseInt(form.vao) : null,
        canteiro: form.canteiro ? parseInt(form.canteiro) : null,
        data_descarte: form.data_descarte,
      };
      if (editingDescarte) {
        await descartesAPI.update(editingDescarte.id, payload);
        toast.success("Descarte atualizado com sucesso!");
      } else {
        await descartesAPI.create(payload);
        toast.success("Descarte registrado com sucesso!");
      }
      setDialogOpen(false);
      setEditingDescarte(null);
      loadDescartes();
    } catch (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-xl">
            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Descarte</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe mudas descartadas</p>
          </div>
        </div>
        <Button onClick={handleNovo} className="gap-2 shadow-sm bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Novo Descarte
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MOTIVOS.map((m) => {
          const cfg = MOTIVO_CONFIG[m];
          return (
            <StatCard
              key={m}
              icon={cfg.icon}
              label={m}
              value={statsByMotivo[m] || 0}
              color={cfg.color}
            />
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFiltroMotivo("todos")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroMotivo === "todos"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Todos · {totalGeral.toLocaleString("pt-BR")}
          </button>
          {MOTIVOS.map((m) => (
            <button
              key={m}
              onClick={() => setFiltroMotivo(filtroMotivo === m ? "todos" : m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtroMotivo === m
                  ? MOTIVO_CONFIG[m].badge + " ring-1 ring-current"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar variedade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs h-9"
        />
      </div>

      {sortedWeeks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum descarte encontrado</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedWeeks.map((weekKey) => {
            const { week, year, registros, total } = groupedByWeek[weekKey];
            const sortedRegistros = [...registros].sort((a, b) => b.data_descarte.localeCompare(a.data_descarte));
            
            return (
              <div key={weekKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-muted rounded-lg text-sm font-bold text-muted-foreground">
                    Semana {week} / {year}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {total.toLocaleString("pt-BR")} mudas descartadas
                  </span>
                </div>
                
                <div className="grid gap-2">
                  {sortedRegistros.map((d) => {
                    const cfg = MOTIVO_CONFIG[d.motivo] || MOTIVO_CONFIG["Outro"];
                    const MotivoIcon = cfg.icon;
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 p-3 bg-card rounded-xl border hover:border-destructive/30 transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <MotivoIcon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm truncate">{d.variedade}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${cfg.badge}`}>
                              {d.motivo}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {moment(d.data_descarte).format("DD/MM")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {d.estufa ? `E${d.estufa}` : ""}
                            {d.lado ? ` ${d.lado}` : ""}
                            {d.vao ? ` · V${d.vao}` : ""}
                            {d.canteiro ? `-C${d.canteiro}` : ""}
                            {d.observacao ? ` · ${d.motivo === "Doença" ? `Doença: ${d.observacao}` : d.observacao}` : ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 pr-2">
                          <p className="font-bold text-sm text-destructive">{(d.quantidade || 0).toLocaleString("pt-BR")}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">mudas</p>
                        </div>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(d)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(d.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingDescarte(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDescarte ? "Editar Descarte" : "Novo Descarte"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Variedade *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:ring-1 focus:ring-destructive"
                value={form.variedade}
                onChange={(e) => setForm({ ...form, variedade: e.target.value })}
              >
                <option value="">Selecione...</option>
                {VARIEDADES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Quantidade de mudas *</Label>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus:ring-1 focus:ring-destructive"
                value={form.motivo}
                onChange={(e) => {
                  const motivo = e.target.value;
                  setForm({ ...form, motivo, observacao: motivo === form.motivo ? form.observacao : "" });
                }}
              >
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {form.motivo === "Doença" && (
              <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/60 p-3">
                <Label className="text-red-800">Qual doença? *</Label>
                <Input
                  autoFocus
                  placeholder="Ex: Botrytis, Ferrugem, Fusarium..."
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
                <p className="text-xs text-red-700">A especificação aparecerá junto ao motivo do descarte.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estufa</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1"
                  value={form.estufa}
                  onChange={(e) => setForm({ ...form, estufa: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lado</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.lado}
                  onChange={(e) => setForm({ ...form, lado: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Vão</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={form.vao}
                  onChange={(e) => setForm({ ...form, vao: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Canteiro</Label>
                <Input
                  type="number"
                  placeholder="Ex: 2"
                  value={form.canteiro}
                  onChange={(e) => setForm({ ...form, canteiro: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data_descarte}
                onChange={(e) => setForm({ ...form, data_descarte: e.target.value })}
              />
            </div>

            {form.motivo !== "Doença" && (
              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Input
                  placeholder="Ex: Hastes tortas, flores passadas..."
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingDescarte(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.variedade || !form.quantidade || (form.motivo === "Doença" && !form.observacao.trim())}
              className="bg-destructive hover:bg-destructive/90"
            >
              {saving ? "Salvando..." : editingDescarte ? "Salvar Alterações" : "Registrar Descarte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este descarte? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
