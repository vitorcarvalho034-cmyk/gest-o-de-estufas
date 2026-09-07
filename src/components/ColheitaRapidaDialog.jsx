import { useEffect, useMemo, useState } from "react";
import { colheitasAPI, canteirosAPI } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scissors, Check, ChevronLeft, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";
import { isVariedadeFixa, isVariedadeGirassol } from "@/lib/coresVariedades";
import { enqueue } from "@/lib/offlineQueue";

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

const today = () => new Date().toISOString().split("T")[0];

function getDestinoFixo(variedade) {
  if (isVariedadeFixa(variedade)) return { destino: "Barracão", hastesPorCesto: 40 };
  if (isVariedadeGirassol(variedade)) return { destino: "Barracão", hastesPorCesto: 50 };
  return null;
}

function getDestinosDisponiveis(variedade) {
  if (!variedade) return Object.entries(DESTINOS);
  if (variedade.toLowerCase().includes("anastasia")) {
    return Object.entries(DESTINOS).filter(([name]) => name.startsWith("Oferta"));
  }
  return Object.entries(DESTINOS);
}

function emptyForm() {
  return {
    estufa: "",
    lado: "",
    vao: "",
    canteiro: "",
    variedade: "",
    destino: "",
    cestos: "",
    macos: "",
    hastes_avulsas: "",
    data_colheita: today(),
  };
}

export default function ColheitaRapidaDialog({ open, onClose, onSaved, onOpenCompleto }) {
  const [form, setForm] = useState(emptyForm);
  const [canteiros, setCanteiros] = useState([]);
  const [variedades, setVariedades] = useState([]);
  const [selectedCanteiro, setSelectedCanteiro] = useState(false);
  const [loadingCanteiros, setLoadingCanteiros] = useState(false);
  const [saving, setSaving] = useState(false);

  const vaos = useMemo(
    () => (form.estufa ? getVaosArray(parseInt(form.estufa, 10)) : []),
    [form.estufa]
  );

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setVariedades([]);
    setSelectedCanteiro(false);
    setLoadingCanteiros(true);
    canteirosAPI.list()
      .then((list) => setCanteiros(Array.isArray(list) ? list : []))
      .catch((error) => {
        console.warn("Erro ao carregar canteiros:", error);
        toast.error("Não foi possível carregar os canteiros");
      })
      .finally(() => setLoadingCanteiros(false));
  }, [open]);

  function updateBase(field, value) {
    if (field === "estufa") {
      setForm((f) => ({ ...f, estufa: value, lado: "", vao: "", canteiro: "", variedade: "", destino: "", cestos: "", macos: "", hastes_avulsas: "" }));
      setVariedades([]);
      setSelectedCanteiro(false);
      return;
    }
    if (field === "lado") {
      setForm((f) => ({ ...f, lado: value, vao: "", canteiro: "", variedade: "", destino: "", cestos: "", macos: "", hastes_avulsas: "" }));
      setVariedades([]);
      setSelectedCanteiro(false);
      return;
    }
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectCanteiro(vao, numero) {
    const found = canteiros.find((c) =>
      c.estufa === parseInt(form.estufa, 10) &&
      c.lado === form.lado &&
      c.vao === parseInt(vao, 10) &&
      (c.numero ?? c.canteiro) === numero
    );
    const list = (found?.variedades || [])
      .map((v) => v?.nome || v?.variedade || v)
      .filter(Boolean);
    const first = list.length === 1 ? list[0] : "";
    const fixed = getDestinoFixo(first);
    setVariedades(list);
    setSelectedCanteiro(true);
    setForm((f) => ({
      ...f,
      vao: String(vao),
      canteiro: String(numero),
      variedade: first,
      destino: fixed ? fixed.destino : "",
      cestos: "",
      macos: "",
      hastes_avulsas: "",
    }));
  }

  function selectVariedade(value) {
    const fixed = getDestinoFixo(value);
    const destinos = getDestinosDisponiveis(value).map(([name]) => name);
    setForm((f) => ({
      ...f,
      variedade: value,
      destino: fixed ? fixed.destino : (destinos.includes(f.destino) ? f.destino : ""),
    }));
  }

  function voltarParaCanteiros() {
    setSelectedCanteiro(false);
    setVariedades([]);
    setForm((f) => ({ ...f, vao: "", canteiro: "", variedade: "", destino: "", cestos: "", macos: "", hastes_avulsas: "" }));
  }

  const destinoFixo = getDestinoFixo(form.variedade);
  const hastesPorCesto = destinoFixo ? destinoFixo.hastesPorCesto : (DESTINOS[form.destino] || 0);
  const hastesPorMaco = destinoFixo ? 0 : (HASTES_POR_MACO[form.destino] || 0);
  const total =
    (parseInt(form.cestos, 10) || 0) * hastesPorCesto +
    (parseInt(form.macos, 10) || 0) * hastesPorMaco +
    (parseInt(form.hastes_avulsas, 10) || 0);

  const canSave = Boolean(
    form.estufa && form.lado && form.vao && form.canteiro && form.variedade.trim() &&
    (destinoFixo || form.destino) && total > 0
  );

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    const hastes = total;
    const colheitaData = {
      estufa: parseInt(form.estufa, 10),
      lado: form.lado,
      vao: parseInt(form.vao, 10),
      canteiro: parseInt(form.canteiro, 10),
      variedade: form.variedade.trim(),
      destino: destinoFixo ? destinoFixo.destino : form.destino,
      cestos: parseInt(form.cestos, 10) || 0,
      hastes_avulsas: parseInt(form.hastes_avulsas, 10) || 0,
      hastes,
      data_colheita: form.data_colheita,
      semana: moment(form.data_colheita).isoWeek(),
    };

    try {
      if (!navigator.onLine) {
        enqueue("Colheita", colheitaData);
        window.dispatchEvent(new Event("offline-queue-updated"));
        toast.success(`📴 ${hastes.toLocaleString("pt-BR")} hastes salvas offline`);
      } else {
        try {
          await colheitasAPI.create(colheitaData);
          toast.success(`✂️ ${hastes.toLocaleString("pt-BR")} hastes registradas`);
        } catch (networkError) {
          console.warn("Falha online; colheita enviada para a fila:", networkError);
          enqueue("Colheita", colheitaData);
          window.dispatchEvent(new Event("offline-queue-updated"));
          toast.warning("⚠️ Salvo na fila; será sincronizado automaticamente");
        }
      }
      await onSaved?.();
      // Mantém estufa, lado e data; limpa apenas o lançamento atual.
      setSelectedCanteiro(false);
      setVariedades([]);
      setForm((f) => ({ ...f, vao: "", canteiro: "", variedade: "", destino: "", cestos: "", macos: "", hastes_avulsas: "", data_colheita: f.data_colheita || today() }));
    } catch (error) {
      toast.error(`Erro ao salvar colheita: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" /> Lançamento rápido de colheita
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Escolha estufa e lado uma vez; depois toque apenas no canteiro.</span>
          <Button variant="ghost" size="sm" onClick={onOpenCompleto} className="shrink-0 text-xs">Formulário completo</Button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-1">
          {[1, 2, 3, 4].map((number) => (
            <button
              key={number}
              onClick={() => updateBase("estufa", String(number))}
              className={`rounded-xl border-2 py-3 font-bold text-lg transition-all ${form.estufa === String(number) ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-background border-border hover:border-primary/50"}`}
            >E{number}</button>
          ))}
        </div>

        {form.estufa && (
          <div className="grid grid-cols-2 gap-2">
            {["A", "B"].map((side) => (
              <button
                key={side}
                onClick={() => updateBase("lado", side)}
                className={`rounded-xl border-2 py-3 font-bold transition-all ${form.lado === side ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-background border-border hover:border-primary/50"}`}
              >Lado {side}</button>
            ))}
          </div>
        )}

        {form.lado && !selectedCanteiro && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Escolha o canteiro</p>
              {loadingCanteiros && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
              {vaos.map((vao) => (
                <div key={vao} className="rounded-xl border p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Vão {vao}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((numero) => (
                      <button
                        key={numero}
                        onClick={() => selectCanteiro(vao, numero)}
                        className="rounded-lg border-2 border-border bg-background py-3 text-sm font-bold hover:border-primary hover:bg-primary/5 transition-all"
                      >C{numero}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {form.lado && selectedCanteiro && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">Local selecionado</p>
                <p className="font-bold">E{form.estufa} · Lado {form.lado} · V{form.vao}-C{form.canteiro}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={voltarParaCanteiros} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Trocar
              </Button>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Variedade</p>
              {variedades.length > 0 && (
                <div className="grid gap-2 max-h-36 overflow-y-auto">
                  {variedades.map((variedade) => (
                    <button
                      key={variedade}
                      onClick={() => selectVariedade(variedade)}
                      className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all ${form.variedade === variedade ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/50"}`}
                    >
                      {variedade}{form.variedade === variedade && <Check className="inline ml-2 w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={form.variedade}
                onChange={(event) => selectVariedade(event.target.value)}
                placeholder={variedades.length ? "Ou digite outra variedade" : "Digite a variedade"}
                className="mt-2 h-10"
              />
            </div>

            {form.variedade && (
              <>
                {destinoFixo ? (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
                    Destino fixo: <strong>Barracão</strong> · {destinoFixo.hastesPorCesto} hastes/cesto
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold mb-2">Destino</p>
                    <div className="grid grid-cols-2 gap-2">
                      {getDestinosDisponiveis(form.variedade).map(([name, perBasket]) => (
                        <button
                          key={name}
                          onClick={() => updateBase("destino", name)}
                          className={`rounded-lg border-2 px-3 py-2 text-left transition-all ${form.destino === name ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
                        >
                          <span className="text-sm font-semibold">{name}</span>
                          <span className={`block text-xs ${form.destino === name ? "opacity-75" : "text-muted-foreground"}`}>{perBasket} hastes/cesto</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(destinoFixo || form.destino) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Cestos</p>
                      <Input type="number" min="0" value={form.cestos} onChange={(event) => updateBase("cestos", event.target.value)} placeholder="0" className="h-11 text-lg font-bold" autoFocus />
                    </div>
                    {hastesPorMaco > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Maços ({hastesPorMaco}/maço)</p>
                        <Input type="number" min="0" value={form.macos} onChange={(event) => updateBase("macos", event.target.value)} placeholder="0" className="h-11 text-lg font-bold" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Hastes avulsas</p>
                      <Input type="number" min="0" value={form.hastes_avulsas} onChange={(event) => updateBase("hastes_avulsas", event.target.value)} placeholder="0" className="h-11 text-lg font-bold" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/15 px-3 py-3">
                  <span className="text-sm text-muted-foreground">Total do lançamento</span>
                  <span className="text-2xl font-black text-primary">{total.toLocaleString("pt-BR")} hastes</span>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={voltarParaCanteiros} className="gap-1"><RotateCcw className="w-4 h-4" /> Outro canteiro</Button>
                  <Button onClick={handleSave} disabled={!canSave || saving} className="gap-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? "Salvando..." : "Salvar e próximo"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {form.estufa && form.lado && !selectedCanteiro && (
          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => updateBase("estufa", "")} className="gap-1"><X className="w-4 h-4" /> Limpar seleção</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
EOF
