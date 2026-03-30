import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ChevronRight, ChevronLeft, Check, MapPin, Leaf, AlertTriangle, Calendar, Bug, Scale, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getVaosArray } from "@/lib/estufasConfig";
import { enqueue } from "@/lib/offlineQueue";

const MOTIVOS = [
  { label: "Doença", icon: AlertTriangle, color: "text-red-600", active: "bg-red-500 text-white border-red-500" },
  { label: "Praga", icon: Bug, color: "text-orange-600", active: "bg-orange-500 text-white border-orange-500" },
  { label: "Qualidade", icon: Leaf, color: "text-yellow-600", active: "bg-yellow-500 text-white border-yellow-500" },
  { label: "Excesso", icon: Scale, color: "text-blue-600", active: "bg-blue-500 text-white border-blue-500" },
  { label: "Outro", icon: MoreHorizontal, color: "text-gray-600", active: "bg-gray-500 text-white border-gray-500" },
];

const STEPS = [
  { icon: MapPin, label: "Local" },
  { icon: Leaf, label: "Variedade" },
  { icon: AlertTriangle, label: "Descarte" },
  { icon: Calendar, label: "Confirmar" },
];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? "bg-destructive text-destructive-foreground" :
                active ? "bg-destructive/10 border-2 border-destructive text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-destructive" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${done ? "bg-destructive" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepLocal({ form, onChange }) {
  const vaosArray = form.estufa ? getVaosArray(parseInt(form.estufa)) : [];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a estufa</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} onClick={() => onChange("estufa", String(n))}
              className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                form.estufa === String(n) ? "bg-destructive text-destructive-foreground border-destructive shadow-md scale-105" : "bg-background border-border hover:border-destructive/50"
              }`}>E{n}</button>
          ))}
        </div>
      </div>
      {form.estufa && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o lado</p>
          <div className="grid grid-cols-2 gap-3">
            {["A", "B"].map((l) => (
              <button key={l} onClick={() => onChange("lado", l)}
                className={`py-5 rounded-xl border-2 font-bold text-2xl transition-all ${
                  form.lado === l ? "bg-destructive text-destructive-foreground border-destructive shadow-md" : "bg-background border-border hover:border-destructive/50"
                }`}>Lado {l}</button>
            ))}
          </div>
        </div>
      )}
      {form.lado && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o vão</p>
          <div className="flex flex-wrap gap-2">
            {vaosArray.map((v) => (
              <button key={v} onClick={() => onChange("vao", String(v))}
                className={`w-12 h-12 rounded-lg border-2 font-semibold text-sm transition-all ${
                  form.vao === String(v) ? "bg-destructive text-destructive-foreground border-destructive shadow-md" : "bg-background border-border hover:border-destructive/50"
                }`}>V{v}</button>
            ))}
          </div>
        </div>
      )}
      {form.vao && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o canteiro</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((c) => (
              <button key={c} onClick={() => onChange("canteiro", String(c))}
                className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                  form.canteiro === String(c) ? "bg-destructive text-destructive-foreground border-destructive shadow-md scale-105" : "bg-background border-border hover:border-destructive/50"
                }`}>C{c}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepVariedade({ form, onChange, variedades }) {
  return (
    <div className="space-y-4">
      {variedades.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Variedades neste canteiro</p>
          <div className="grid gap-2">
            {variedades.map((v) => (
              <button key={v} onClick={() => onChange("variedade", v)}
                className={`w-full p-3.5 rounded-xl border-2 font-medium text-sm text-left transition-all flex items-center justify-between ${
                  form.variedade === v ? "bg-destructive/10 border-destructive text-destructive" : "bg-background border-border hover:border-destructive/50"
                }`}>
                <span>{v}</span>
                {form.variedade === v && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">{variedades.length > 0 ? "Ou digite outra" : "Digite a variedade"}</p>
        <Input placeholder="Ex: Anastasia Fuego" value={form.variedade}
          onChange={(e) => onChange("variedade", e.target.value)}
          className="text-base h-11" autoFocus={variedades.length === 0} />
      </div>
    </div>
  );
}

function StepDescarte({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Motivo do descarte</p>
        <div className="grid grid-cols-3 gap-2">
          {MOTIVOS.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.label} onClick={() => onChange("motivo", m.label)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                  form.motivo === m.label ? m.active + " shadow-md" : "bg-background border-border hover:border-primary/30"
                }`}>
                <Icon className={`w-5 h-5 ${form.motivo === m.label ? "opacity-90" : m.color}`} />
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Quantidade de mudas</p>
        <div className="flex items-center gap-3">
          <button onClick={() => onChange("quantidade", String(Math.max(0, (parseInt(form.quantidade) || 0) - 10)))}
            className="w-12 h-12 rounded-xl border-2 border-border text-xl font-bold hover:border-destructive/50 transition-all flex items-center justify-center">-10</button>
          <input type="number" value={form.quantidade} onChange={(e) => onChange("quantidade", e.target.value)}
            className="flex-1 text-center text-3xl font-bold h-14 rounded-xl border-2 border-border focus:border-destructive focus:outline-none bg-background" min={0} />
          <button onClick={() => onChange("quantidade", String((parseInt(form.quantidade) || 0) + 10))}
            className="w-12 h-12 rounded-xl border-2 border-border text-xl font-bold hover:border-destructive/50 transition-all flex items-center justify-center">+10</button>
        </div>
        <div className="flex justify-center gap-2 mt-2">
          {[50, 100, 200, 500].map((v) => (
            <button key={v} onClick={() => onChange("quantidade", String(v))}
              className="px-3 py-1 text-xs rounded-lg bg-muted hover:bg-muted/70 font-medium transition-all">
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Observação (opcional)</p>
        <Textarea placeholder="Detalhes adicionais..." value={form.observacao}
          onChange={(e) => onChange("observacao", e.target.value)} rows={2} />
      </div>
    </div>
  );
}

function StepConfirm({ form, onChange }) {
  const mInfo = MOTIVOS.find((m) => m.label === form.motivo);
  const Icon = mInfo?.icon || AlertTriangle;
  return (
    <div className="space-y-4">
      <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Local</span>
          <span className="font-semibold">E{form.estufa} Lado {form.lado} · V{form.vao}-C{form.canteiro}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Variedade</span>
          <span className="font-semibold">{form.variedade}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Motivo</span>
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${mInfo?.color}`} />
            <span className="font-semibold">{form.motivo}</span>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Mudas descartadas</span>
          <span className="text-2xl font-black text-destructive">{parseInt(form.quantidade || 0).toLocaleString("pt-BR")}</span>
        </div>
      </div>
      {form.observacao && (
        <p className="text-sm text-muted-foreground italic">"{form.observacao}"</p>
      )}
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Data do Descarte</Label>
        <Input type="date" value={form.data_descarte} onChange={(e) => onChange("data_descarte", e.target.value)} className="mt-1.5 h-11 text-base" />
      </div>
    </div>
  );
}

export default function DescarteWizard({ open, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [variedades, setVariedades] = useState([]);
  const [form, setForm] = useState({
    estufa: "", lado: "", vao: "", canteiro: "",
    variedade: "", quantidade: "", motivo: "", observacao: "",
    data_descarte: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (form.estufa && form.lado && form.vao && form.canteiro) {
      base44.entities.Canteiro.filter({
        estufa: parseInt(form.estufa), lado: form.lado,
        vao: parseInt(form.vao), numero: parseInt(form.canteiro),
      }).then((list) => {
        setVariedades(list[0]?.variedades?.map((v) => v.nome) || []);
      });
    }
  }, [form.canteiro]);

  function updateForm(field, value) {
    if (field === "estufa") setForm((f) => ({ ...f, estufa: value, lado: "", vao: "", canteiro: "", variedade: "" }));
    else if (field === "lado") setForm((f) => ({ ...f, lado: value, vao: "", canteiro: "", variedade: "" }));
    else if (field === "vao") setForm((f) => ({ ...f, vao: value, canteiro: "", variedade: "" }));
    else setForm((f) => ({ ...f, [field]: value }));
  }

  function canProceed() {
    if (step === 0) return form.estufa && form.lado && form.vao && form.canteiro;
    if (step === 1) return form.variedade.trim().length > 0;
    if (step === 2) return form.motivo && parseInt(form.quantidade) > 0;
    return true;
  }

  async function handleSave() {
    setSaving(true);
    const data = {
      estufa: parseInt(form.estufa), lado: form.lado,
      vao: parseInt(form.vao), canteiro: parseInt(form.canteiro),
      variedade: form.variedade, quantidade: parseInt(form.quantidade),
      motivo: form.motivo, observacao: form.observacao,
      data_descarte: form.data_descarte,
    };
    const offline = !navigator.onLine;
    if (offline) {
      enqueue('Descarte', data);
      window.dispatchEvent(new Event('offline-queue-updated'));
      toast.success(`📴 ${form.quantidade} mudas salvas offline — serão sincronizadas quando houver conexão`);
    } else {
      await base44.entities.Descarte.create(data);
      toast.success(`🗑️ ${form.quantidade} mudas descartadas — ${form.motivo}`);
    }
    setSaving(false);
    handleClose();
    onSaved();
  }

  function handleClose() {
    setStep(0);
    setForm({ estufa: "", lado: "", vao: "", canteiro: "", variedade: "", quantidade: "", motivo: "", observacao: "", data_descarte: new Date().toISOString().split("T")[0] });
    setVariedades([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" /> Novo Descarte
          </DialogTitle>
        </DialogHeader>
        <ProgressBar step={step} />
        <div className="min-h-[200px] max-h-[60vh] overflow-y-auto pr-1">
          {step === 0 && <StepLocal form={form} onChange={updateForm} />}
          {step === 1 && <StepVariedade form={form} onChange={updateForm} variedades={variedades} />}
          {step === 2 && <StepDescarte form={form} onChange={updateForm} />}
          {step === 3 && <StepConfirm form={form} onChange={updateForm} />}
        </div>
        <div className="flex gap-2 mt-4">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} variant="destructive" className="gap-1">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleSave} disabled={saving} className="gap-2">
              <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Confirmar Descarte"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}