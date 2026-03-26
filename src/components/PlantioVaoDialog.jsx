import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

const EMPTY_VARIEDADE = { nome: "", quantidade: "" };

function CanteiroInput({ numero, variedades, onChange }) {
  const total = variedades.reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);
  const over = total > 2000;

  function updateVariedade(idx, field, value) {
    const updated = variedades.map((v, i) => i === idx ? { ...v, [field]: value } : v);
    onChange(updated);
  }

  function addVariedade() {
    if (variedades.length >= 4) return;
    onChange([...variedades, { ...EMPTY_VARIEDADE }]);
  }

  function removeVariedade(idx) {
    onChange(variedades.filter((_, i) => i !== idx));
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${over ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/20"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase">Canteiro {numero}</span>
        <span className={`text-xs font-semibold ${over ? "text-destructive" : total > 1600 ? "text-accent-foreground" : "text-muted-foreground"}`}>
          {total} / 2000 mudas
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-destructive" : total > 1600 ? "bg-accent" : "bg-primary"}`}
          style={{ width: `${Math.min((total / 2000) * 100, 100)}%` }}
        />
      </div>

      {variedades.map((v, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_80px_28px] gap-1.5 items-center">
          <Input
            placeholder="Variedade"
            value={v.nome}
            onChange={(e) => updateVariedade(idx, "nome", e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            type="number"
            placeholder="Qtd"
            value={v.quantidade}
            onChange={(e) => updateVariedade(idx, "quantidade", e.target.value)}
            min={1}
            max={2000}
            className="h-7 text-xs"
          />
          <button
            onClick={() => removeVariedade(idx)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {variedades.length < 4 && (
        <button
          onClick={addVariedade}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" /> Variedade
        </button>
      )}

      {over && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" /> Limite de 2000 mudas excedido
        </div>
      )}
    </div>
  );
}

export default function PlantioVaoDialog({ open, onClose, onSaved }) {
  const [estufa, setEstufa] = useState(null);
  const [lado, setLado] = useState("");
  const [vao, setVao] = useState(null);
  const [dataPlantio, setDataPlantio] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  // canteiros[0..3] = canteiro 1..4, each has array of variedades
  const [canteiros, setCanteiros] = useState([
    [{ ...EMPTY_VARIEDADE }],
    [{ ...EMPTY_VARIEDADE }],
    [{ ...EMPTY_VARIEDADE }],
    [{ ...EMPTY_VARIEDADE }],
  ]);

  function reset() {
    setEstufa(null);
    setLado("");
    setVao(null);
    setDataPlantio(new Date().toISOString().split("T")[0]);
    setCanteiros([
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
    ]);
  }

  function updateCanteiro(idx, variedades) {
    setCanteiros((prev) => prev.map((c, i) => i === idx ? variedades : c));
  }

  async function handleSubmit() {
    if (!estufa || !lado || !vao) {
      toast.error("Selecione estufa, lado e vão");
      return;
    }

    // Validate
    for (let i = 0; i < 4; i++) {
      const total = canteiros[i].reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);
      if (total > 2000) {
        toast.error(`Canteiro ${i + 1} ultrapassa 2000 mudas`);
        return;
      }
    }

    setSaving(true);
    const semana = getWeekNumber(dataPlantio);

    for (let i = 0; i < 4; i++) {
      const numero = i + 1;
      const variedadesValidas = canteiros[i].filter((v) => v.nome.trim() && parseInt(v.quantidade) > 0);
      if (variedadesValidas.length === 0) continue;

      // Create plantio records
      for (const v of variedadesValidas) {
        await base44.entities.Plantio.create({
          estufa,
          lado,
          vao,
          canteiro: numero,
          variedade: v.nome.trim(),
          quantidade: parseInt(v.quantidade),
          data_plantio: dataPlantio,
          semana,
        });
      }

      // Update canteiro entity
      const canteirosExistentes = await base44.entities.Canteiro.filter({ estufa, lado, vao, numero });
      const variedadesMap = {};
      if (canteirosExistentes.length > 0) {
        (canteirosExistentes[0].variedades || []).forEach((v) => { variedadesMap[v.nome] = v.quantidade; });
      }
      variedadesValidas.forEach((v) => {
        variedadesMap[v.nome.trim()] = (variedadesMap[v.nome.trim()] || 0) + parseInt(v.quantidade);
      });
      const novasVariedades = Object.entries(variedadesMap).map(([nome, quantidade]) => ({ nome, quantidade }));
      const totalMudas = novasVariedades.reduce((s, v) => s + v.quantidade, 0);

      if (canteirosExistentes.length > 0) {
        await base44.entities.Canteiro.update(canteirosExistentes[0].id, { variedades: novasVariedades, total_mudas: totalMudas });
      } else {
        await base44.entities.Canteiro.create({ estufa, lado, vao, numero, variedades: novasVariedades, total_mudas: totalMudas });
      }
    }

    toast.success("Plantio registrado com sucesso!");
    setSaving(false);
    reset();
    onClose();
    onSaved();
  }

  const vaosArray = estufa ? getVaosArray(estufa) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Plantio — Vão Completo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Location + date */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estufa *</Label>
              <Select value={String(estufa || "")} onValueChange={(v) => { setEstufa(parseInt(v)); setVao(null); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>Estufa {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lado *</Label>
              <Select value={lado} onValueChange={setLado}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Lado A</SelectItem>
                  <SelectItem value="B">Lado B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vão *</Label>
              <Select value={String(vao || "")} onValueChange={(v) => setVao(parseInt(v))} disabled={!estufa}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {vaosArray.map((n) => <SelectItem key={n} value={String(n)}>Vão {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Plantio</Label>
              <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} />
            </div>
          </div>

          {/* 4 canteiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {canteiros.map((vars, idx) => (
              <CanteiroInput
                key={idx}
                numero={idx + 1}
                variedades={vars}
                onChange={(v) => updateCanteiro(idx, v)}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Canteiros vazios (sem variedade ou quantidade) serão ignorados.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : "Registrar Plantio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}