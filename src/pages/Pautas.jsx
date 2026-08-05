import { useState, useEffect } from "react";
import { pautaSemanaAPI, previsaoColheitaAPI, colheitasAPI } from "@/api/supabaseClient";
import { ClipboardList, ChevronLeft, ChevronRight, Save, Edit2, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";
moment.locale("pt-br");

// ─── helpers ──────────────────────────────────────────────────────────────────
function getWeekDates(week, year) {
  const start = moment().year(year).isoWeek(week).startOf("isoWeek");
  const end   = start.clone().add(5, "days");
  return { start: start.format("DD/MM"), end: end.format("DD/MM") };
}

function navigateWeekCalc(semana, ano, dir) {
  let s = semana + dir, a = ano;
  const maxWeek = moment(`${a}-12-28`).isoWeek();
  if (s < 1) { a -= 1; s = moment(`${a}-12-28`).isoWeek(); }
  else if (s > maxWeek) { a += 1; s = 1; }
  return { semana: s, ano: a };
}

const ANAST_60 = ['fuego', 'magnum', 'fiebre'];
const isAnastasia = (n) => (n || '').toLowerCase().includes('anastasia');
const isAnast60   = (n) => isAnastasia(n) && ANAST_60.some(v => (n||'').toLowerCase().includes(v));
const isAnast80   = (n) => isAnastasia(n) && !isAnast60(n);
const isFloraFixa = (n) => {
  const l = (n||'').toLowerCase();
  return ['sinzii','tasmania','klara','piuma','shooting','oshi','supreme','girassol','sunflower'].some(v => l.includes(v));
};

// ─── Linha de destino ──────────────────────────────────────────────────────────
function DestinoRow({ emoji, label, previsto, enviado, onEnvChange, prevIsAuto, saved }) {
  const prev = parseInt(previsto) || 0;
  const env  = parseInt(enviado)  || 0;
  const diff = env - prev;
  const pct  = prev > 0 ? Math.round((env / prev) * 100) : null;

  return (
    <div className="py-4 border-b last:border-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{emoji}</span>
        <span className="font-semibold text-sm">{label}</span>
        {prevIsAuto && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">auto</span>}
        {pct !== null && (
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
            pct >= 100 ? "bg-green-100 text-green-700" :
            pct >= 80  ? "bg-amber-100 text-amber-700" :
                         "bg-red-100 text-red-600"
          }`}>{pct}% enviado</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Previsto (cxs)</p>
          {prevIsAuto ? (
            <div className="h-9 flex items-center px-3 rounded-md bg-muted/50 border text-sm font-mono font-semibold text-primary">
              {prev > 0 ? prev.toLocaleString("pt-BR") : "—"}
            </div>
          ) : (
            <Input
              type="number" min="0"
              value={previsto}
              onChange={e => onEnvChange && onEnvChange(e.target.value, "prev")}
              placeholder="0"
              className="h-9 text-sm text-right font-mono"
              disabled={saved}
            />
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Enviado Cooperflora (cxs)</p>
          <Input
            type="number" min="0"
            value={enviado}
            onChange={e => onEnvChange && onEnvChange(e.target.value, "env")}
            placeholder="0"
            className="h-9 text-sm text-right font-mono"
            disabled={saved}
          />
        </div>
      </div>
      {pct !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className={`text-xs font-medium ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
            {diff >= 0 ? "+" : ""}{diff} cxs
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Card de hastes previstas x colhidas ──────────────────────────────────────
function HastesComparativo({ prevHastes, realHastes }) {
  const pct  = prevHastes > 0 ? Math.round((realHastes / prevHastes) * 100) : null;
  const diff = realHastes - prevHastes;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <h2 className="text-base font-bold">📊 Hastes — Previsão × Real</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Previsto</p>
          <p className="text-2xl font-bold">{prevHastes > 0 ? prevHastes.toLocaleString("pt-BR") : "—"}</p>
          <p className="text-xs text-muted-foreground">hastes</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Colhido</p>
          <p className="text-2xl font-bold text-primary">{realHastes > 0 ? realHastes.toLocaleString("pt-BR") : "—"}</p>
          <p className="text-xs text-muted-foreground">hastes</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${pct !== null && pct >= 90 ? "bg-green-50 border border-green-200" : pct !== null ? "bg-red-50 border border-red-200" : "bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">% Atingido</p>
          <p className={`text-2xl font-bold ${pct !== null && pct >= 90 ? "text-green-700" : pct !== null ? "text-red-600" : "text-muted-foreground"}`}>
            {pct !== null ? `${pct}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">do previsto</p>
        </div>
      </div>
      {prevHastes > 0 && realHastes > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-sm font-semibold ${color}`}>{diff >= 0 ? "+" : ""}{diff.toLocaleString("pt-BR")} h</span>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Pautas() {
  const hoje = moment();
  // Abre na semana anterior por padrão (para fechar a semana passada)
  const semPadrao = hoje.isoWeek() - 1 < 1 ? moment(`${hoje.year()-1}-12-28`).isoWeek() : hoje.isoWeek() - 1;
  const anoPadrao = hoje.isoWeek() - 1 < 1 ? hoje.year() - 1 : hoje.year();

  const [semana, setSemana] = useState(semPadrao);
  const [ano,    setAno]    = useState(anoPadrao);
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);

  // Dados calculados da previsão (auto)
  const [cestosOfertaAuto,   setCestosOfertaAuto]   = useState(0);
  const [cestosBarracaoAuto, setCestosBarracaoAuto] = useState(0);
  const [cestosMercadoAuto,  setCestosMercadoAuto]  = useState(0);
  const [prevHastes,         setPrevHastes]          = useState(0);
  const [realHastes,         setRealHastes]          = useState(0);
  const [realBarracao,       setRealBarracao]        = useState(0); // colhido real do Barracão

  // Campos manuais
  const [envOferta,   setEnvOferta]   = useState("");
  const [envMercado,  setEnvMercado]  = useState("");
  const [prevBuques,  setPrevBuques]  = useState("");
  const [envBuques,   setEnvBuques]   = useState("");
  const [obs,         setObs]         = useState("");

  async function load(sem, a) {
    setLoading(true);
    try {
      const [previsoes, colheitas, pauta] = await Promise.all([
        previsaoColheitaAPI.list(1000),
        colheitasAPI.listByAno(a),
        pautaSemanaAPI.getBySemana(sem, a).catch(() => null),
      ]);

      // ── Calcular previsão da semana ──
      const prevSem = previsoes.filter(p => p.semana === sem && p.ano === a && !isFloraFixa(p.variedade));
      const totalPrev = prevSem.reduce((s, p) => s + (p.hastes_previstas || 0), 0);
      setPrevHastes(totalPrev);

      // Anastasia 60h/80h por cesto
      const hAnast80 = prevSem.filter(p => isAnast80(p.variedade)).reduce((s, p) => s + (p.hastes_previstas||0), 0);
      const hAnast60 = prevSem.filter(p => isAnast60(p.variedade)).reduce((s, p) => s + (p.hastes_previstas||0), 0);
      const hAnast   = hAnast80 + hAnast60;
      // Mercado: puxar cestos_mercado do banco; fallback para localStorage se ainda não foi salvo
      const cestosMercadoDB = pauta?.cestos_mercado
        || parseInt(localStorage.getItem(`mercado_cestos_${a}_${sem}`)) || 0;
      const hastesMercado   = cestosMercadoDB * 60;
      const metade   = Math.round(totalPrev * 0.5);
      const hOfertas = Math.max(hAnast, metade);
      const hBarracao = Math.max(0, totalPrev - hOfertas - hastesMercado);
      setCestosOfertaAuto(hOfertas > 0 ? Math.floor(hOfertas / 60) : 0);
      setCestosBarracaoAuto(hBarracao > 0 ? Math.floor(hBarracao / 50) : 0);
      setCestosMercadoAuto(cestosMercadoDB);

      // ── Colheita real da semana ──
      const colSem = colheitas.filter(c => c.semana === sem && !isFloraFixa(c.variedade));
      setRealHastes(colSem.reduce((s, c) => s + (c.hastes || 0), 0));
      // Barracão: total colhido real (cestos)
      const colBarracao = colSem.filter(c => (c.destino || '').toLowerCase().includes('barrac'));
      setRealBarracao(colBarracao.reduce((s, c) => s + (c.cestos || 0), 0));

      // ── Carregar pauta salva ──
      if (pauta) {
        setEnvOferta(pauta.env_oferta?.toString()   || "");
        setEnvMercado(pauta.env_mercado?.toString()  || "");
        setPrevBuques(pauta.prev_buques?.toString()  || "");
        setEnvBuques(pauta.env_buques?.toString()    || "");
        setObs(pauta.observacoes || "");
        setSaved(true);
      } else {
        setEnvOferta(""); setEnvMercado("");
        setPrevBuques(""); setEnvBuques(""); setObs("");
        setSaved(false);
      }
    } catch (e) {
      console.warn("Pautas load error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(semana, ano); }, [semana, ano]);

  function navigate(dir) {
    const next = navigateWeekCalc(semana, ano, dir);
    setSemana(next.semana); setAno(next.ano);
    setSaved(false);
  }

  async function handleSalvar() {
    try {
      await pautaSemanaAPI.upsert(semana, ano, {
        env_oferta:   parseInt(envOferta)   || 0,
        env_mercado:  parseInt(envMercado)  || 0,
        prev_buques:  parseInt(prevBuques)  || 0,
        env_buques:   parseInt(envBuques)   || 0,
        observacoes: obs,
      });
      setSaved(true);
      toast.success("✅ Pauta salva com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar pauta: " + e.message);
    }
  }

  const weekDates = getWeekDates(semana, ano);
  const totalPrevCoop = cestosOfertaAuto + cestosMercadoAuto + (parseInt(prevBuques)||0);
  const totalEnvCoop  = (parseInt(envOferta)||0) + (parseInt(envMercado)||0) + (parseInt(envBuques)||0);
  const totalPct = totalPrevCoop > 0 ? Math.round((totalEnvCoop / totalPrevCoop) * 100) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <ClipboardList className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pautas da Semana</h1>
          <p className="text-sm text-muted-foreground">Reunião comercial — fechamento semanal</p>
        </div>
      </div>

      {/* Navegador de semana */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-xl font-bold">Semana {semana} — {ano}</p>
              <p className="text-sm text-muted-foreground">{weekDates.start} a {weekDates.end}</p>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Pauta salva
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hastes previstas x colhidas */}
      <HastesComparativo prevHastes={prevHastes} realHastes={realHastes} />

      {/* Destinos — Cooperflora */}
      <div className="bg-card border rounded-2xl p-5">
        <h2 className="text-base font-bold mb-1">📦 Previsto × Enviado Cooperflora</h2>
        <p className="text-xs text-muted-foreground mb-1">
          Campos <span className="bg-blue-50 text-blue-600 border border-blue-200 px-1 rounded text-[10px]">auto</span> são calculados da Previsão de Colheita
        </p>

        <DestinoRow
          emoji="🌸" label="Oferta"
          previsto={cestosOfertaAuto} prevIsAuto
          enviado={envOferta}
          onEnvChange={(v) => setEnvOferta(v)}
          saved={saved}
        />
        {/* Barracão — sem envio Cooperflora, apenas Previsto x Total Colhido */}
        <div className="py-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🏠</span>
            <span className="font-semibold text-sm">Barracão</span>
            <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">auto</span>
            <span className="ml-auto text-[10px] text-muted-foreground italic">uso interno — sem envio Cooperflora</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Previsto (cestos)</p>
              <div className="h-9 flex items-center px-3 rounded-md bg-muted/50 border text-sm font-mono font-semibold text-primary">
                {cestosBarracaoAuto > 0 ? cestosBarracaoAuto.toLocaleString("pt-BR") : "—"}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Colhido (cestos)</p>
              <div className="h-9 flex items-center px-3 rounded-md bg-green-50 border border-green-200 text-sm font-mono font-semibold text-green-700">
                {realBarracao > 0 ? realBarracao.toLocaleString("pt-BR") : "—"}
              </div>
            </div>
          </div>
          {cestosBarracaoAuto > 0 && realBarracao > 0 && (() => {
            const pct = Math.round((realBarracao / cestosBarracaoAuto) * 100);
            const diff = realBarracao - cestosBarracaoAuto;
            return (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className={`text-xs font-medium ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {pct}% · {diff >= 0 ? "+" : ""}{diff} cs
                </span>
              </div>
            );
          })()}
        </div>
        <DestinoRow
          emoji="🛒" label="Mercado"
          previsto={cestosMercadoAuto} prevIsAuto
          enviado={envMercado}
          onEnvChange={(v) => setEnvMercado(v)}
          saved={saved}
        />
        <DestinoRow
          emoji="💐" label="Buquês"
          previsto={prevBuques} prevIsAuto={false}
          enviado={envBuques}
          onEnvChange={(v, field) => field === "prev" ? setPrevBuques(v) : setEnvBuques(v)}
          saved={saved}
        />

        {/* Totais */}
        {(totalPrevCoop > 0 || totalEnvCoop > 0) && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Previsto</p>
              <p className="text-2xl font-bold">{totalPrevCoop.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">cxs</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Enviado</p>
              <p className="text-2xl font-bold text-primary">{totalEnvCoop.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">cxs Cooperflora</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${totalPct !== null && totalPct >= 90 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              <p className="text-xs text-muted-foreground">% Atingido</p>
              <p className={`text-2xl font-bold ${totalPct !== null && totalPct >= 90 ? "text-green-700" : "text-amber-700"}`}>
                {totalPct !== null ? `${totalPct}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">do previsto</p>
            </div>
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold">📝 Observações da Reunião</h2>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          disabled={saved}
          placeholder="Anotações, decisões tomadas, pendências..."
          rows={4}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-60"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 justify-end pb-6">
        {saved && (
          <Button variant="outline" onClick={() => setSaved(false)} className="gap-2">
            <Edit2 className="w-4 h-4" /> Editar
          </Button>
        )}
        <Button onClick={handleSalvar} className="gap-2" disabled={saved}>
          <Save className="w-4 h-4" />
          {saved ? "Salvo" : "Salvar Pauta"}
        </Button>
      </div>

    </div>
  );
}
