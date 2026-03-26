import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Sprout, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import moment from "moment";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

function alocarVariedades(canteiros, variedades) {
  const sorted = [...canteiros].sort((a, b) => {
    const aOcup = a.total_mudas || 0;
    const bOcup = b.total_mudas || 0;
    if (aOcup === 0 && bOcup === 0) return 0;
    if (aOcup === 0) return 1;
    if (bOcup === 0) return -1;
    return bOcup - aOcup;
  });

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
      if (existing) existing.quantidade += toPlant;
      else s.variedades.push({ nome: variedade, quantidade: toPlant });
      allocations.push({ canteiroObj: s.canteiro, variedade, quantidade: toPlant });
      remaining -= toPlant;
    }
    if (remaining > 0) errors.push(`"${variedade}": faltam ${remaining} mudas para alocar`);
  }

  return { allocations, errors, state };
}

export default function NotaFiscalDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState("upload"); // upload | extracting | preview | done
  const [file, setFile] = useState(null);
  const [dataPlantio, setDataPlantio] = useState(new Date().toISOString().split("T")[0]);
  const [extracted, setExtracted] = useState([]);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  async function handleExtract() {
    if (!file) { toast.error("Selecione a nota fiscal"); return; }
    setStep("extracting");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Esta é uma nota fiscal de mudas/plantas. Extraia todas as variedades de flores/plantas e suas respectivas quantidades (número de mudas). Retorne apenas os itens que são claramente mudas ou plantas. Ignore itens como embalagens, fretes, etc.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                variedade: { type: "string" },
                quantidade: { type: "integer" },
              },
            },
          },
        },
      },
    });

    const itens = result.itens || [];
    if (itens.length === 0) {
      toast.error("Não foi possível extrair variedades da nota fiscal");
      setStep("upload");
      return;
    }

    setExtracted(itens);
    const canteiros = await base44.entities.Canteiro.list();
    const { allocations, errors: errs, state } = alocarVariedades(canteiros, itens);
    setPreview({ allocations, state });
    setErrors(errs);
    setStep("preview");
  }

  async function handleConfirm() {
    setSaving(true);
    const semana = getWeekNumber(dataPlantio);
    for (const alloc of preview.allocations) {
      const c = alloc.canteiroObj;
      await base44.entities.Plantio.create({
        estufa: c.estufa, lado: c.lado, vao: c.vao, canteiro: c.numero,
        variedade: alloc.variedade, quantidade: alloc.quantidade,
        data_plantio: dataPlantio, semana,
      });
    }
    for (const s of preview.state) {
      const orig = s.canteiro;
      if (JSON.stringify(orig.variedades) !== JSON.stringify(s.variedades)) {
        await base44.entities.Canteiro.update(orig.id, { variedades: s.variedades, total_mudas: s.total_mudas });
      }
    }
    toast.success(`Plantio registrado com sucesso!`);
    setSaving(false);
    setStep("done");
    onSaved();
  }

  function handleClose() {
    setStep("upload");
    setFile(null);
    setExtracted([]);
    setPreview(null);
    setErrors([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Plantio via Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Envie a nota fiscal (imagem ou PDF) e a IA extrai automaticamente as variedades e quantidades para alocação.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nota Fiscal (imagem ou PDF) *</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Plantio</Label>
              <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} />
            </div>
          </div>
        )}

        {step === "extracting" && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="font-semibold">Lendo a nota fiscal...</p>
            <p className="text-sm text-muted-foreground">A IA está extraindo as variedades e calculando a alocação</p>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Extraído da nota fiscal:</p>
              {extracted.map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{r.variedade}</span>
                  <span className="font-medium text-primary">{r.quantidade} mudas</span>
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" /> Avisos
                </div>
                {errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Alocação nos canteiros:</p>
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
              Total: {preview.allocations.reduce((s, a) => s + a.quantidade, 0).toLocaleString("pt-BR")} mudas → {new Set(preview.allocations.map((a) => a.canteiroObj.id)).size} canteiros
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
              <Button onClick={handleExtract} disabled={!file}>Ler Nota Fiscal →</Button>
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
          {step === "done" && <Button onClick={handleClose}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}