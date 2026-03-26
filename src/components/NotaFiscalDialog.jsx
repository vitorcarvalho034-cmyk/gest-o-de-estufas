import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Plus, Trash2, CheckCircle2, PackageOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import moment from "moment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVaosArray } from "@/lib/estufasConfig";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

export default function NotaFiscalDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState("upload");
  const [files, setFiles] = useState([null, null, null]);
  const [dataPlantio, setDataPlantio] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState([]); // [{variedade, total, remaining, allocations:[{estufa,lado,vao,canteiro,quantidade}]}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Allocation form state
  const [allocForm, setAllocForm] = useState({ variedadeIdx: null, estufa: "", lado: "", vao: "", canteiro: "", quantidade: "" });

  function handleFileChange(i, file) {
    const copy = [...files];
    copy[i] = file;
    setFiles(copy);
  }

  async function handleExtract() {
    const validFiles = files.filter(Boolean);
    if (validFiles.length === 0) { toast.error("Adicione pelo menos uma nota fiscal"); return; }
    setLoading(true);
    setStep("extracting");

    const aggregated = {};
    for (const file of validFiles) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Esta é uma nota fiscal de mudas. Extraia todas as variedades e quantidades seguindo estas regras:

1. O nome do produto aparece no formato "MUDAS CRIS. NOME_DA_VARIEDADE C/ RAIZ". Extraia APENAS o que está entre "MUDAS CRIS." e "C/ RAIZ" como nome da variedade. Exemplo: "MUDAS CRIS. CALIMERO PINK C/ RAIZ" → variedade = "CALIMERO PINK".
2. A quantidade está na coluna "QUANT" no formato "1,000" onde a vírgula é separador de milhar. Converta para número inteiro: "1,000" = 1000, "500" = 500.
3. Ignore qualquer item que não siga o padrão "MUDAS CRIS.".

Retorne a lista de variedades com suas quantidades.`,
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

      for (const item of (result.itens || [])) {
        const key = item.variedade.trim().toUpperCase();
        aggregated[key] = (aggregated[key] || 0) + item.quantidade;
      }
    }

    if (Object.keys(aggregated).length === 0) {
      toast.error("Não foi possível extrair variedades das notas fiscais");
      setStep("upload");
      setLoading(false);
      return;
    }

    setItems(Object.entries(aggregated).map(([variedade, total]) => ({
      variedade, total, remaining: total, allocations: []
    })));
    setLoading(false);
    setStep("alloc");
  }

  function addAllocation() {
    const { variedadeIdx, estufa, lado, vao, canteiro, quantidade } = allocForm;
    if (variedadeIdx === null || !estufa || !lado || !vao || !canteiro || !quantidade) {
      toast.error("Preencha todos os campos"); return;
    }
    const qty = parseInt(quantidade);
    const copy = [...items];
    const item = copy[variedadeIdx];
    if (qty > item.remaining) { toast.error(`Saldo insuficiente. Restam ${item.remaining} mudas`); return; }
    item.remaining -= qty;
    item.allocations.push({ estufa: parseInt(estufa), lado, vao: parseInt(vao), canteiro: parseInt(canteiro), quantidade: qty });
    setItems(copy);
    setAllocForm({ variedadeIdx: null, estufa: "", lado: "", vao: "", canteiro: "", quantidade: "" });
  }

  function removeAllocation(itemIdx, allocIdx) {
    const copy = [...items];
    const removed = copy[itemIdx].allocations[allocIdx];
    copy[itemIdx].remaining += removed.quantidade;
    copy[itemIdx].allocations.splice(allocIdx, 1);
    setItems(copy);
  }

  async function handleConfirm() {
    const hasAllocations = items.some(i => i.allocations.length > 0);
    if (!hasAllocations) { toast.error("Faça pelo menos uma alocação"); return; }
    setSaving(true);
    const semana = getWeekNumber(dataPlantio);

    for (const item of items) {
      for (const alloc of item.allocations) {
        await base44.entities.Plantio.create({
          estufa: alloc.estufa, lado: alloc.lado, vao: alloc.vao, canteiro: alloc.canteiro,
          variedade: item.variedade, quantidade: alloc.quantidade,
          data_plantio: dataPlantio, semana,
        });
        // Update canteiro
        const canteiros = await base44.entities.Canteiro.filter({
          estufa: alloc.estufa, lado: alloc.lado, vao: alloc.vao, numero: alloc.canteiro
        });
        if (canteiros.length > 0) {
          const c = canteiros[0];
          const variedades = [...(c.variedades || [])];
          const existing = variedades.find(v => v.nome === item.variedade);
          if (existing) existing.quantidade += alloc.quantidade;
          else variedades.push({ nome: item.variedade, quantidade: alloc.quantidade });
          await base44.entities.Canteiro.update(c.id, {
            variedades,
            total_mudas: (c.total_mudas || 0) + alloc.quantidade
          });
        }
      }
    }

    toast.success("Plantio registrado com sucesso!");
    setSaving(false);
    setStep("done");
    onSaved();
  }

  function handleClose() {
    setStep("upload");
    setFiles([null, null, null]);
    setItems([]);
    setAllocForm({ variedadeIdx: null, estufa: "", lado: "", vao: "", canteiro: "", quantidade: "" });
    onClose();
  }

  const vaosArray = allocForm.estufa ? getVaosArray(parseInt(allocForm.estufa)) : [];
  const totalAllocated = items.reduce((s, i) => s + i.allocations.reduce((ss, a) => ss + a.quantidade, 0), 0);
  const totalRemaining = items.reduce((s, i) => s + i.remaining, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Plantio via Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Envie até 3 notas fiscais — a IA lê e agrupa todas as variedades e quantidades.</p>
            <div className="grid gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs">Nota Fiscal {i + 1}{i === 0 ? " *" : " (opcional)"}</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(i, e.target.files[0])} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Plantio</Label>
              <Input type="date" value={dataPlantio} onChange={(e) => setDataPlantio(e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP: EXTRACTING */}
        {step === "extracting" && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="font-semibold">Lendo as notas fiscais...</p>
            <p className="text-sm text-muted-foreground">Aguarde enquanto extraímos as variedades</p>
          </div>
        )}

        {/* STEP: ALLOCATION */}
        {step === "alloc" && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/5 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Alocado</p>
                <p className="text-lg font-bold text-primary">{totalAllocated.toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex-1 bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo restante</p>
                <p className="text-lg font-bold">{totalRemaining.toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {/* Varieties remaining */}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{item.variedade}</span>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${item.remaining === 0 ? "text-green-600" : "text-primary"}`}>
                        {item.remaining === 0 ? "✓ Completo" : `${item.remaining.toLocaleString("pt-BR")} restantes`}
                      </span>
                      <p className="text-[10px] text-muted-foreground">Total: {item.total.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  {/* Existing allocations */}
                  {item.allocations.map((a, ai) => (
                    <div key={ai} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-xs">
                      <span>E{a.estufa} {a.lado} V{a.vao}-C{a.canteiro}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.quantidade.toLocaleString("pt-BR")} mudas</span>
                        <button onClick={() => removeAllocation(i, ai)} className="text-destructive hover:opacity-70">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add allocation row */}
                  {item.remaining > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      <Select value={allocForm.variedadeIdx === i ? allocForm.estufa : ""} onValueChange={(v) => setAllocForm({ variedadeIdx: i, estufa: v, lado: "", vao: "", canteiro: "", quantidade: "" })}>
                        <SelectTrigger className="h-7 text-xs flex-1 min-w-[70px]"><SelectValue placeholder="Estufa" /></SelectTrigger>
                        <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>E{n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={allocForm.variedadeIdx === i ? allocForm.lado : ""} onValueChange={(v) => setAllocForm(f => ({ ...f, variedadeIdx: i, lado: v }))} disabled={allocForm.variedadeIdx !== i || !allocForm.estufa}>
                        <SelectTrigger className="h-7 text-xs flex-1 min-w-[60px]"><SelectValue placeholder="Lado" /></SelectTrigger>
                        <SelectContent>{["A","B"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={allocForm.variedadeIdx === i ? allocForm.vao : ""} onValueChange={(v) => setAllocForm(f => ({ ...f, variedadeIdx: i, vao: v }))} disabled={allocForm.variedadeIdx !== i || !allocForm.lado}>
                        <SelectTrigger className="h-7 text-xs flex-1 min-w-[60px]"><SelectValue placeholder="Vão" /></SelectTrigger>
                        <SelectContent>{vaosArray.map(n => <SelectItem key={n} value={String(n)}>V{n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={allocForm.variedadeIdx === i ? allocForm.canteiro : ""} onValueChange={(v) => setAllocForm(f => ({ ...f, variedadeIdx: i, canteiro: v }))} disabled={allocForm.variedadeIdx !== i || !allocForm.vao}>
                        <SelectTrigger className="h-7 text-xs flex-1 min-w-[60px]"><SelectValue placeholder="C." /></SelectTrigger>
                        <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>C{n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input
                        className="h-7 text-xs flex-1 min-w-[80px]"
                        type="number"
                        placeholder={`Qtd (max ${item.remaining})`}
                        value={allocForm.variedadeIdx === i ? allocForm.quantidade : ""}
                        onChange={(e) => setAllocForm(f => ({ ...f, variedadeIdx: i, quantidade: e.target.value }))}
                      />
                      <Button size="sm" className="h-7 px-2" onClick={addAllocation}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: DONE */}
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
              <Button onClick={handleExtract} disabled={!files.some(Boolean)}>
                <PackageOpen className="w-4 h-4 mr-1" /> Ler Notas Fiscais
              </Button>
            </>
          )}
          {step === "alloc" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={saving || !items.some(i => i.allocations.length > 0)}>
                {saving ? "Salvando..." : "Confirmar Plantio"}
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={handleClose}>Fecher</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}