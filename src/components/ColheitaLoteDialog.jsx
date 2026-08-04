import { useState, useEffect } from "react";
import { colheitasAPI, canteirosAPI } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scissors, Check, Loader2, ChevronDown, ChevronUp, WifiOff, Leaf } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { enqueue } from "@/lib/offlineQueue";

// Cache de canteiros no localStorage para uso offline
const CANTEIROS_CACHE_KEY = "canteiros_cache";
function cacheCanteiros(list) {
  try { localStorage.setItem(CANTEIROS_CACHE_KEY, JSON.stringify(list)); } catch { /* quota */ }
}
function getCanteirosCache() {
  try { return JSON.parse(localStorage.getItem(CANTEIROS_CACHE_KEY) || "[]"); } catch { return []; }
}

const DESTINOS = {
  "Barracão": 50,
  "Mercado": 60,
  "Oferta 60": 60,
  "Oferta 80": 80,
};

// Estufa 2 tem destino fixo: Barracão com 40 hastes/cesto (Statice/Limonium)
const DESTINOS_ESTUFA2 = { "Barracão": 40 };
function isEstufaFixa(estufaNum) { return parseInt(estufaNum) === 2; }

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

export default function ColheitaLoteDialog({ open, onClose, onSaved }) {
  const [estufa, setEstufa] = useState("");
  const [destino, setDestino] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [canteiros, setCanteiros] = useState([]);
  const [entradas, setEntradas] = useState({}); // { canteiro_id: { cestos: "", variedade: "" } }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandidos, setExpandidos] = useState({}); // { "lado-vao": true }
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitorar conexão
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setEstufa("");
      setDestino("");
      setData(new Date().toISOString().split("T")[0]);
      setCanteiros([]);
      setEntradas({});
      setExpandidos({});
    }
  }, [open]);

  // Ao selecionar Estufa 2, auto-selecionar destino fixo Barracão (40 hastes/cesto)
  useEffect(() => {
    if (isEstufaFixa(estufa)) {
      setDestino("Barracão");
    }
  }, [estufa]);

  useEffect(() => {
    if (!estufa) return;
    setLoading(true);
    async function loadCanteiros() {
      let list = [];
      try {
        list = await canteirosAPI.list();
        cacheCanteiros(list); // atualiza cache
      } catch {
        // offline ou erro de rede — usa cache
        list = getCanteirosCache();
        if (list.length > 0) toast.info("📴 Usando dados em cache (modo offline)");
      }
      const filtrados = list.filter(c => c.estufa === parseInt(estufa));
      setCanteiros(filtrados);
      const init = {};
      filtrados.forEach(c => {
        const varPrincipal = c.variedades?.[0]?.variedade || c.variedades?.[0]?.nome || "";
        init[c.id] = { cestos: "", variedade: varPrincipal };
      });
      setEntradas(init);
      setLoading(false);
    }
    loadCanteiros();
  }, [estufa]);

  // Agrupar canteiros por lado e vão
  const grupos = canteiros.reduce((acc, c) => {
    const key = `${c.lado}-${c.vao}`;
    if (!acc[key]) acc[key] = { lado: c.lado, vao: c.vao, canteiros: [] };
    acc[key].canteiros.push(c);
    return acc;
  }, {});

  const gruposOrdenados = Object.values(grupos).sort((a, b) => {
    if (a.lado !== b.lado) return a.lado.localeCompare(b.lado);
    return a.vao - b.vao;
  });

  function toggleExpandido(key) {
    setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function updateCestos(canteiroId, valor) {
    setEntradas(prev => ({ ...prev, [canteiroId]: { ...prev[canteiroId], cestos: valor } }));
  }

  function updateVariedade(canteiroId, valor) {
    setEntradas(prev => ({ ...prev, [canteiroId]: { ...prev[canteiroId], variedade: valor } }));
  }

  // Preencher todos os canteiros de um vão com o mesmo valor
  function preencherVao(canteiroIds, valor) {
    setEntradas(prev => {
      const novo = { ...prev };
      canteiroIds.forEach(id => { novo[id] = { ...novo[id], cestos: valor }; });
      return novo;
    });
  }

  // Estufa 2: 40 hastes/cesto (Statice/Limonium); demais: conforme destino selecionado
  const destinosDisponiveis = isEstufaFixa(estufa) ? DESTINOS_ESTUFA2 : DESTINOS;
  const pressasPorCesto = isEstufaFixa(estufa) ? 40 : (destino ? (DESTINOS[destino] || 0) : 0);

  // Contar quantos têm valor preenchido
  const preenchidos = Object.values(entradas).filter(e => parseInt(e.cestos) > 0).length;
  const totalCestos = Object.values(entradas).reduce((s, e) => s + (parseInt(e.cestos) || 0), 0);
  const totalHastes = totalCestos * pressasPorCesto;

  async function handleSalvar() {
    if (!destino) { toast.error("Selecione o destino!"); return; }
    if (preenchidos === 0) { toast.error("Preencha pelo menos um canteiro!"); return; }

    setSaving(true);
    const semana = getWeekNumber(data);
    const offline = !navigator.onLine;

    // Montar lista de colheitas
    const colheitasParaSalvar = canteiros
      .filter(c => parseInt(entradas[c.id]?.cestos) > 0)
      .map(c => ({
        estufa: c.estufa,
        lado: c.lado,
        vao: c.vao,
        canteiro: c.numero,
        variedade: entradas[c.id].variedade || "—",
        destino,
        cestos: parseInt(entradas[c.id].cestos),
        pressas: parseInt(entradas[c.id].cestos) * pressasPorCesto,
        data_colheita: data,
        semana,
      }));

    if (offline) {
      // Modo offline: enfileirar tudo no localStorage
      colheitasParaSalvar.forEach(col => enqueue("Colheita", col));
      window.dispatchEvent(new Event("offline-queue-updated"));
      setSaving(false);
      toast.success(
        `📴 ${colheitasParaSalvar.length} colheitas salvas offline — ${totalCestos} cestos, ${totalHastes.toLocaleString("pt-BR")} hastes. Serão sincronizadas ao reconectar.`
      );
      onSaved();
      onClose();
      return;
    }

    // Modo online: salvar no Supabase
    let salvos = 0;
    let erros = 0;
    const promessas = colheitasParaSalvar.map(async (col) => {
      try {
        await colheitasAPI.create(col);
        salvos++;
      } catch {
        // Falhou durante envio — enfileira para retry
        enqueue("Colheita", col);
        erros++;
      }
    });

    await Promise.all(promessas);
    setSaving(false);

    if (erros === 0) {
      toast.success(`✂️ ${salvos} colheitas registradas — ${totalCestos} cestos, ${totalHastes.toLocaleString("pt-BR")} hastes`);
      onSaved();
      onClose();
    } else if (salvos > 0) {
      // Dispara sync imediato para tentar enviar os que falharam
      window.dispatchEvent(new Event("offline-queue-updated"));
      toast.warning(`✂️ ${salvos} salvas · ${erros} na fila — sincronizando...`);
      onSaved();
      onClose();
    } else {
      // Dispara sync imediato — pode ser falha transitória de rede
      window.dispatchEvent(new Event("offline-queue-updated"));
      toast.warning(`⚠️ ${erros} colheitas na fila — sincronizando...`);
      onSaved();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Colheita em Lote
            {isOffline && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Configurações */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {/* Estufa */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Estufa</p>
            <div className="flex gap-1 flex-wrap">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setEstufa(String(n))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    estufa === String(n)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  E{n}
                </button>
              ))}
            </div>
          </div>

          {/* Destino */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Destino</p>
            {isEstufaFixa(estufa) ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-emerald-700">Barracão — 40 hastes/cesto</span>
              </div>
            ) : (
              <div className="flex gap-1 flex-wrap">
                {Object.entries(destinosDisponiveis).map(([nome, pressas]) => (
                  <button
                    key={nome}
                    onClick={() => setDestino(nome)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      destino === nome
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Data</p>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-background"
            />
          </div>
        </div>

        {/* Resumo */}
        {preenchidos > 0 && destino && (
          <div className="flex gap-4 bg-primary/5 rounded-lg px-3 py-2 text-sm shrink-0">
            <span className="font-medium">{preenchidos} canteiros</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium">{totalCestos} cestos</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-primary">{totalHastes.toLocaleString("pt-BR")} hastes</span>
          </div>
        )}

        {/* Lista de vãos */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!estufa && !loading && (
            <p className="text-center text-muted-foreground text-sm py-8">Selecione uma estufa para começar</p>
          )}

          {gruposOrdenados.map(({ lado, vao, canteiros: cants }) => {
            const key = `${lado}-${vao}`;
            const aberto = expandidos[key] !== false; // aberto por padrão
            const totalVao = cants.reduce((s, c) => s + (parseInt(entradas[c.id]?.cestos) || 0), 0);
            const primeiroVaridade = cants[0] ? (entradas[cants[0].id]?.variedade || "") : "";

            return (
              <div key={key} className="border rounded-lg overflow-hidden">
                {/* Cabeçalho do vão */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpandido(key)}
                >
                  <span className="font-medium text-sm">Lado {lado} — Vão {vao}</span>
                  <span className="text-xs text-muted-foreground">{cants.length} canteiros</span>
                  {totalVao > 0 && (
                    <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {totalVao} cestos
                    </span>
                  )}
                  {totalVao === 0 && (
                    <div className="ml-auto flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="Cestos p/ todos"
                        className="w-28 border rounded px-2 py-0.5 text-xs bg-background"
                        onClick={e => e.stopPropagation()}
                        onBlur={e => {
                          if (e.target.value) preencherVao(cants.map(c => c.id), e.target.value);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {aberto ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                </div>

                {/* Canteiros do vão */}
                {aberto && (
                  <div className="divide-y">
                    {cants.map(c => {
                      const entrada = entradas[c.id] || { cestos: "", variedade: "" };
                      const varOpcoes = c.variedades?.map(v => v.variedade || v.nome).filter(Boolean) || [];
                      return (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                          <span className="text-xs text-muted-foreground w-6">C{c.numero}</span>
                          {/* Variedade */}
                          {varOpcoes.length > 1 ? (
                            <select
                              value={entrada.variedade}
                              onChange={e => updateVariedade(c.id, e.target.value)}
                              className="flex-1 border rounded px-2 py-1 text-xs bg-background"
                            >
                              {varOpcoes.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          ) : (
                            <span className="flex-1 text-xs font-medium truncate">{entrada.variedade || "—"}</span>
                          )}
                          {/* Cestos */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateCestos(c.id, String(Math.max(0, (parseInt(entrada.cestos) || 0) - 1)))}
                              className="w-6 h-6 rounded border text-xs hover:bg-accent flex items-center justify-center"
                            >−</button>
                            <input
                              type="number"
                              min="0"
                              value={entrada.cestos}
                              onChange={e => updateCestos(c.id, e.target.value)}
                              className="w-14 border rounded px-1 py-1 text-xs text-center bg-background"
                              placeholder="0"
                            />
                            <button
                              onClick={() => updateCestos(c.id, String((parseInt(entrada.cestos) || 0) + 1))}
                              className="w-6 h-6 rounded border text-xs hover:bg-accent flex items-center justify-center"
                            >+</button>
                          </div>
                          {parseInt(entrada.cestos) > 0 && destino && (
                            <span className="text-xs text-muted-foreground w-16 text-right">
                              {(parseInt(entrada.cestos) * pressasPorCesto).toLocaleString("pt-BR")} h
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botões */}
        <div className="flex gap-2 shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={handleSalvar}
            disabled={saving || preenchidos === 0 || !destino}
            className="flex-1 gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : isOffline ? (
              <><WifiOff className="w-4 h-4" /> Salvar Offline {preenchidos > 0 ? `(${preenchidos})` : ""}</>
            ) : (
              <><Check className="w-4 h-4" /> Salvar {preenchidos > 0 ? `${preenchidos} colheitas` : "Colheitas"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
