import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, CheckCircle2, AlertTriangle, Sprout } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import moment from "moment";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

function parseCSV(text) {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    const [variedade, quantidade] = line.split(/[,;]/).map((s) => s.trim().replace(/"/g, ""));
    if (!variedade || variedade.toLowerCase() === "variedade") continue; // skip header
    const qty = parseInt(quantidade);
    if (variedade && !isNaN(qty) && qty > 0) {
      rows.push({ variedade, quantidade: qty });
    }
  }
  return rows;
}

function exportTemplate() {
  const content = "variedade,quantidade\nAnastasia Fuego,500\nRoyal Crystal,800\n";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_plantio.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Allocate varieties to canteiros. Returns array of allocations: {canteiro, variedade, quantidade, isNew}
function alocarVariedades(canteiros, variedades) {
  // Sort canteiros: prefer ones already occupied (fill up) then empty
  const sorted = [...canteiros].sort((a, b) => {
    const aOcup = a.total_mudas || 0;
    const bOcup = b.total_mudas || 0;
    if (aOcup === 0 && bOcup === 0) return 0;
    if (aOcup === 0) return 1;
    if (bOcup === 0) return -1;
    return bOcup - aOcup; // most occupied first
  });

  // Mutable state per canteiro
  const state = sorted.map((c) => ({
    canteiro: c,
    variedades: [...(c.variedades || [])],
    total_mudas: c.total_mudas || 0,
  }));

  const allocations = [];
  const errors = [];

  for (const { variedade, quantidade } of variedades) {
    let remaining = quantidade;

    for (const s of state) {
      if (remaining <= 0) break;
      const available = 2000 - s.total_mudas;
      if (available <= 0) continue;
      if (s.variedades.length >= 4 && !s.variedades.find((v) => v.nome === variedade)) continue;

      const toPlant = Math.min(remaining, available);
      s.total_mudas += toPlant;
      const existing = s.variedades.find((v) => v.nome === variedade);
      if (existing) {
        existing.quantidade += toPlant;
      } else {
        s.variedades.push({ nome: variedade, quantidade: toPlant });
      }
      allocations.push({
        canteiroObj: s.canteiro,
        variedade,
        quantidade: toPlant,
      });
      remaining -= toPlant;
    }

    if (remaining > 0) {
      errors.push(`"${variedade}": faltam ${remaining} mudas para alocar (canteiros cheios)`);
    }
  }

  return { allocations, errors, state };
}

export default function PlantioCSVDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [rows, setRows] = useState([]);
  const [dataPlantio, setDataPlantio] = useState(new Date().toISOString().split("T")[0]);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida encontrada no CSV");
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (rows.length === 0) { toast.error("Carregue um arquivo CSV primeiro"); return; }
    setSaving(true);
    const canteiros = await base44.entities.Canteiro.list();
    const { allocations, errors: errs, state } = alocarVariedades(canteiros, rows);
    setPreview({ allocations, state });
    setErrors(errs);
    setStep("preview");
    setSaving(false);
  }

  async function handleConfirm() {
    setSaving(true);
    const semana = getWeekNumber(dataPlantio);

    for (const alloc of preview.allocations) {
      const c = alloc.canteiroObj;
      await base44.entities.Plantio.create({
        estufa: c.estufa,
        lado: c.lado,
        vao: c.vao,
        canteiro: c.numero,
        variedade: alloc.variedade,
        quantidade: alloc.quantidade,
        data_plantio: dataPlantio,
        semana,
      });
    }

    // Update canteiros
    for (const s of preview.state) {
      const orig = s.canteiro;
      if (JSON.stringify(orig.variedades) !== JSON.stringify(s.variedades)) {
        await base44.entities.Canteiro.update(orig.id, {
          variedades: s.variedades,
          total_mudas: s.total_mudas,
        });
      }
    }

    toast.success(`${preview.allocations.length} alocações registradas com sucesso!`);
    setSaving(false);
    setStep("done");
    onSaved();
  }

  function handleClose() {
    setStep("upload");
    setRows([]);
    setPreview(null);
    setErrors([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Importar Plantio via CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                O CSV deve ter duas colunas: <strong>variedade</strong> e <strong>quantidade</strong>. O sistema alocará automaticamente nos próximos canteiros disponíveis.
              </p>
              <Button variant="outline" size="sm" onClick={exportTemplate} className="gap-2 w-full">
                <Download className="w-4 h-4" /> Baixar Template CSV
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo CSV *</Label>
              <Input type="file" accept=".csv,.txt" onChange={handleFile} />
            </div>

            {rows.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{rows.length} variedades lidas:</p>
                {rows.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{r.variedade}</span>
                    <span className="font-medium text-primary">{r.quantidade} mudas</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Data do Plantio</Label>
              <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} />
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Revise as alocações antes de confirmar:</p>

            {errors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-destructive text-xs font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" /> Avisos
                </div>
                {errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {preview.allocations.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-medium">{a.variedade}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{a.quantidade} mudas</p>
                    <p className="text-[10px] text-muted-foreground">
                      E{a.canteiroObj.estufa} {a.canteiroObj.lado} V{a.canteiroObj.vao}-C{a.canteiroObj.numero}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 rounded-lg p-3 text-xs text-primary font-medium">
              Total: {preview.allocations.reduce((s, a) => s + a.quantidade, 0).toLocaleString("pt-BR")} mudas → {new Set(preview.allocations.map((a) => `${a.canteiroObj.id}`)).size} canteiros
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
            <p className="font-semibold text-lg">Plantio registrado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Todos os canteiros foram atualizados.</p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handlePreview} disabled={rows.length === 0 || saving}>
                {saving ? "Calculando..." : "Visualizar Alocação →"}
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={saving || preview.allocations.length === 0}>
                {saving ? "Salvando..." : "Confirmar Plantio"}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}