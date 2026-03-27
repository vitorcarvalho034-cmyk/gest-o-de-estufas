import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, ChevronRight, ChevronLeft, Check, MapPin, Leaf, Package, Calendar, Trash2, Plus, AlertTriangle, Bug, Scale, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";

const DESTINOS = {
  "Barracão": 50,
  "Mercado": 60,
  "Oferta 60": 60,
  "Oferta 80": 80,
};

const HASTES_POR_MACO = {
  "Mercado": 6,
  "Oferta 60": 10,
  "Oferta 80": 10,
};

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

const STEPS = [
  { icon: MapPin, label: "Local" },
  { icon: Leaf, label: "Variedade" },
  { icon: Package, label: "Colheita" },
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
            <div className={`flex flex-col items-center gap-1 flex-shrink-0`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/10 border-2 border-primary text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Step 1: Location
function StepLocal({ form, onChange }) {
  const vaosArray = form.estufa ? getVaosArray(parseInt(form.estufa)) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a estufa</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onChange("estufa", String(n))}
              className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                form.estufa === String(n)
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : "bg-background border-border hover:border-primary/50 hover:scale-102"
              }`}
            >
              E{n}
            </button>
          ))}
        </div>
      </div>

      {form.estufa && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o lado</p>
          <div className="grid grid-cols-2 gap-3">
            {["A", "B"].map((l) => (
              <button
                key={l}
                onClick={() => onChange("lado", l)}
                className={`py-5 rounded-xl border-2 font-bold text-2xl transition-all ${
                  form.lado === l
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                Lado {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.lado && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o vão</p>
          <div className="flex flex-wrap gap-2">
            {vaosArray.map((v) => (
              <button
                key={v}
                onClick={() => onChange("vao", String(v))}
                className={`w-12 h-12 rounded-lg border-2 font-semibold text-sm transition-all ${
                  form.vao === String(v)
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                V{v}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.vao && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o canteiro</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                onClick={() => onChange("canteiro", String(c))}
                className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${
                  form.canteiro === String(c)
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                C{c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Variety
function StepVariedade({ form, onChange, variedades }) {
  return (
    <div className="space-y-4">
      {variedades.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Variedades neste canteiro</p>
          <div className="grid gap-2">
            {variedades.map((v) => (
              <button
                key={v}
                onClick={() => onChange("variedade", v)}
                className={`w-full p-3.5 rounded-xl border-2 font-medium text-sm text-left transition-all flex items-center justify-between ${
                  form.variedade === v
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                <span>{v}</span>
                {form.variedade === v && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {variedades.length > 0 ? "Ou digite outra" : "Digite a variedade"}
        </p>
        <Input
          placeholder="Ex: Anastasia Fuego"
          value={form.variedade}
          onChange={(e) => onChange("variedade", e.target.value)}
          className="text-base h-11"
          autoFocus={variedades.length === 0}
        />
      </div>
    </div>
  );
}

// Step 3: Harvest
function StepColheita({ form, onChange }) {
  const pressasPorCesto = form.destino ? DESTINOS[form.destino] : 0;
  const hastesPorMaco = form.destino ? (HASTES_POR_MACO[form.destino] || 0) : 0;
  const canUseMacos = !!hastesPorMaco;
  const total = form.modo === "macos"
    ? (parseInt(form.macos) || 0) * hastesPorMaco
    : (parseInt(form.cestos) || 0) * pressasPorCesto;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Destino</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DESTINOS).map(([name, p]) => (
            <button
              key={name}
              onClick={() => { onChange("destino", name); onChange("modo", "cestos"); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.destino === name
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              <p className="font-semibold">{name}</p>
              <p className={`text-xs mt-0.5 ${form.destino === name ? "opacity-70" : "text-muted-foreground"}`}>{p} hastes/cesto</p>
            </button>
          ))}
        </div>
      </div>

      {form.destino && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de registro</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange("modo", "cestos")}
              className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                form.modo !== "macos" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
              }`}
            >
              🧺 Cestos
            </button>
            <button
              onClick={() => canUseMacos && onChange("modo", "macos")}
              disabled={!canUseMacos}
              className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                form.modo === "macos" ? "bg-primary text-primary-foreground border-primary" :
                canUseMacos ? "bg-background border-border hover:border-primary/50" : "bg-muted text-muted-foreground border-border opacity-40 cursor-not-allowed"
              }`}
            >
              💐 Maços
            </button>
          </div>
          {!canUseMacos && form.destino && (
            <p className="text-xs text-muted-foreground mt-1">Maços não disponível para Barracão</p>
          )}
        </div>
      )}

      {form.destino && form.modo === "macos" ? (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Quantidade de maços <span className="text-xs">({hastesPorMaco} hastes/maço)</span></p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange("macos", String(Math.max(0, (parseInt(form.macos) || 0) - 1)))}
              className="w-12 h-12 rounded-xl border-2 border-border text-2xl font-bold hover:border-primary/50 transition-all flex items-center justify-center"
            >−</button>
            <input
              type="number"
              value={form.macos}
              onChange={(e) => onChange("macos", e.target.value)}
              className="flex-1 text-center text-3xl font-bold h-14 rounded-xl border-2 border-border focus:border-primary focus:outline-none bg-background"
              min={0}
            />
            <button
              onClick={() => onChange("macos", String((parseInt(form.macos) || 0) + 1))}
              className="w-12 h-12 rounded-xl border-2 border-border text-2xl font-bold hover:border-primary/50 transition-all flex items-center justify-center"
            >+</button>
          </div>
        </div>
      ) : form.destino ? (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Quantidade de cestos</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange("cestos", String(Math.max(0, (parseInt(form.cestos) || 0) - 1)))}
              className="w-12 h-12 rounded-xl border-2 border-border text-2xl font-bold hover:border-primary/50 transition-all flex items-center justify-center"
            >−</button>
            <input
              type="number"
              value={form.cestos}
              onChange={(e) => onChange("cestos", e.target.value)}
              className="flex-1 text-center text-3xl font-bold h-14 rounded-xl border-2 border-border focus:border-primary focus:outline-none bg-background"
              min={0}
            />
            <button
              onClick={() => onChange("cestos", String((parseInt(form.cestos) || 0) + 1))}
              className="w-12 h-12 rounded-xl border-2 border-border text-2xl font-bold hover:border-primary/50 transition-all flex items-center justify-center"
            >+</button>
          </div>
        </div>
      ) : null}

      {form.destino && total > 0 && (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
          <p className="text-5xl font-black text-primary">{total.toLocaleString("pt-BR")}</p>
          <p className="text-sm text-muted-foreground mt-1">hastes</p>
          {form.modo === "macos" ? (
            <p className="text-xs text-muted-foreground mt-2">{form.macos} maços × {hastesPorMaco} = {total}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">{form.cestos} cestos × {pressasPorCesto} = {total}</p>
          )}
        </div>
      )}
    </div>
  );
}

const MOTIVOS_DESCARTE = [
  { label: "Doença", icon: AlertTriangle, color: "text-red-600" },
  { label: "Praga", icon: Bug, color: "text-orange-600" },
  { label: "Qualidade", icon: Leaf, color: "text-yellow-600" },
  { label: "Excesso", icon: Scale, color: "text-blue-600" },
  { label: "Outro", icon: MoreHorizontal, color: "text-gray-600" },
];

// Step 4: Confirm
function StepConfirm({ form, onChange }) {
  const pressasPorCesto = form.destino ? DESTINOS[form.destino] : 0;
  const hastesPorMaco = form.destino ? (HASTES_POR_MACO[form.destino] || 0) : 0;
  const total = form.modo === "macos"
    ? (parseInt(form.macos) || 0) * hastesPorMaco
    : (parseInt(form.cestos) || 0) * pressasPorCesto;

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
          <span className="text-muted-foreground">Destino</span>
          <span className="font-semibold">{form.destino}</span>
        </div>
        {form.modo === "macos" ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Maços</span>
            <span className="font-semibold">{form.macos} maços ({hastesPorMaco} hastes/maço)</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cestos</span>
            <span className="font-semibold">{form.cestos}</span>
          </div>
        )}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total hastes</span>
          <span className="text-2xl font-black text-primary">{total.toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Data da Colheita</Label>
        <Input
          type="date"
          value={form.data_colheita}
          onChange={(e) => onChange("data_colheita", e.target.value)}
          className="mt-1.5 h-11 text-base"
        />
      </div>

      {/* Descarte opcional */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowDescarte(!showDescarte);
            if (showDescarte) {
              onChange("descarte_motivo", "");
              onChange("descarte_quantidade", "");
            }
          }}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trash2 className="w-4 h-4" />
            <span>Registrar descarte agora? <span className="text-xs">(opcional)</span></span>
          </div>
          <Plus className={`w-4 h-4 transition-transform ${showDescarte ? "rotate-45" : ""}`} />
        </button>

        {showDescarte && (
          <div className="border-t p-3 space-y-3 bg-muted/10">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Motivo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MOTIVOS_DESCARTE.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.label} onClick={() => onChange("descarte_motivo", m.label)}
                      className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-all ${
                        form.descarte_motivo === m.label ? "bg-destructive text-white border-destructive" : "bg-background border-border hover:border-destructive/40"
                      }`}>
                      <Icon className={`w-4 h-4 ${form.descarte_motivo === m.label ? "opacity-90" : m.color}`} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Quantidade de mudas</p>
              <div className="flex items-center gap-2">
                <button onClick={() => onChange("descarte_quantidade", String(Math.max(0, (parseInt(form.descarte_quantidade) || 0) - 10)))}
                  className="w-10 h-10 rounded-lg border text-lg font-bold hover:border-destructive/50 transition-all">-10</button>
                <input type="number" value={form.descarte_quantidade}
                  onChange={(e) => onChange("descarte_quantidade", e.target.value)}
                  className="flex-1 text-center text-2xl font-bold h-10 rounded-lg border focus:border-destructive focus:outline-none bg-background" min={0} />
                <button onClick={() => onChange("descarte_quantidade", String((parseInt(form.descarte_quantidade) || 0) + 10))}
                  className="w-10 h-10 rounded-lg border text-lg font-bold hover:border-destructive/50 transition-all">+10</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ColheitaWizard({ open, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [variedades, setVariedades] = useState([]);
  const [form, setForm] = useState({
    estufa: "", lado: "", vao: "", canteiro: "",
    variedade: "", destino: "", cestos: "", macos: "", modo: "cestos",
    data_colheita: new Date().toISOString().split("T")[0],
    descarte_motivo: "", descarte_quantidade: "",
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
    if (step === 2) {
      if (!form.destino) return false;
      if (form.modo === "macos") return parseInt(form.macos) > 0;
      return parseInt(form.cestos) > 0;
    }
    return true;
  }

  async function handleSave() {
    setSaving(true);
    const hastesPorMaco = HASTES_POR_MACO[form.destino] || 0;
    const pressas = form.modo === "macos"
      ? (parseInt(form.macos) || 0) * hastesPorMaco
      : (parseInt(form.cestos) || 0) * DESTINOS[form.destino];
    const cestos = form.modo === "macos" ? 0 : parseInt(form.cestos);
    await base44.entities.Colheita.create({
      estufa: parseInt(form.estufa), lado: form.lado,
      vao: parseInt(form.vao), canteiro: parseInt(form.canteiro),
      variedade: form.variedade, destino: form.destino,
      cestos, pressas,
      data_colheita: form.data_colheita,
      semana: getWeekNumber(form.data_colheita),
    });
    if (form.descarte_motivo && parseInt(form.descarte_quantidade) > 0) {
      await base44.entities.Descarte.create({
        estufa: parseInt(form.estufa), lado: form.lado,
        vao: parseInt(form.vao), canteiro: parseInt(form.canteiro),
        variedade: form.variedade, quantidade: parseInt(form.descarte_quantidade),
        motivo: form.descarte_motivo,
        data_descarte: form.data_colheita,
      });
    }
    const descarteMsg = form.descarte_motivo && parseInt(form.descarte_quantidade) > 0 ? ` · ${form.descarte_quantidade} descartadas` : "";
    const qtyLabel = form.modo === "macos" ? `${form.macos} maços` : `${form.cestos} cestos`;
    toast.success(`✂️ ${qtyLabel} registrados — ${pressas} hastes${descarteMsg}`);
    setSaving(false);
    handleClose();
    onSaved();
  }

  function handleClose() {
    setStep(0);
    setForm({ estufa: "", lado: "", vao: "", canteiro: "", variedade: "", destino: "", cestos: "", macos: "", modo: "cestos", data_colheita: new Date().toISOString().split("T")[0], descarte_motivo: "", descarte_quantidade: "" });
    setVariedades([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" /> Nova Colheita
          </DialogTitle>
        </DialogHeader>

        <ProgressBar step={step} />

        <div className="min-h-[200px] max-h-[60vh] overflow-y-auto pr-1">
          {step === 0 && <StepLocal form={form} onChange={updateForm} />}
          {step === 1 && <StepVariedade form={form} onChange={updateForm} variedades={variedades} />}
          {step === 2 && <StepColheita form={form} onChange={updateForm} />}
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
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="gap-1">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Confirmar Colheita"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}