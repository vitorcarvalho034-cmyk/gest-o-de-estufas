import { useState, useEffect } from "react";
import { colheitasAPI, previsaoColheitaAPI } from "@/api/supabaseClient";
import { agruparPorCor, PALETA_CORES, getCorVariedade, isVariedadeFixa, isVariedadeGirassol, normalizarVariedade } from "@/lib/coresVariedades";
import { getHastesColheita } from "@/lib/colheitaHastes";
import { Scissors, Plus, TrendingUp, Package, Target, Calendar, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ColheitaWizard from "../components/ColheitaWizard";
import ColheitaLoteDialog from "../components/ColheitaLoteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import moment from "moment";

// Flores fixas (Statice, Limonium, Girassol) ficam fora da meta principal
const isFloraFixa = (variedade) => isVariedadeFixa(variedade) || isVariedadeGirassol(variedade);

const DESTINOS = {
  "Barracão": 50,
  "Mercado": 60,
  "Oferta 60": 60,
  "Oferta 80": 80,
};

const DESTINO_COLORS = {
  "Barracão": "bg-blue-100 text-blue-800",
  "Mercado": "bg-green-100 text-green-800",
  "Oferta 60": "bg-amber-100 text-amber-800",
  "Oferta 80": "bg-orange-100 text-orange-800",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Colheita() {
  const [colheitas, setColheitas] = useState([]);
  const [previsoes, setPrevisoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loteDialogOpen, setLoteDialogOpen] = useState(false);
  const [editingColheita, setEditingColheita] = useState(null);
  const [vozColheitaInicial, setVozColheitaInicial] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [buscaVariedade, setBuscaVariedade] = useState("");
  const [filtroEstufa, setFiltroEstufa] = useState("todas");
  const [filtroCor, setFiltroCor] = useState("todas");
  const [semanaNav, setSemanaNav] = useState(moment().isoWeek());
  const [anoNav, setAnoNav] = useState(moment().year());

  async function loadColheitas(ano) {
    try {
      const [data, prevs] = await Promise.all([
        colheitasAPI.listByAno(ano || anoNav),
        previsaoColheitaAPI.list(),
      ]);
      setColheitas(data);
      setPrevisoes(prevs);
    } catch (e) {
      console.warn('loadColheitas error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadColheitas(anoNav); }, []);

  useEffect(() => {
    const abrirConfirmacaoPorVoz = (evento) => {
      const dados = evento.detail;
      if (!dados) return;
      setEditingColheita(null);
      setVozColheitaInicial(dados);
      setDialogOpen(true);
    };
    try {
      const pendente = JSON.parse(sessionStorage.getItem("agro-vitao-colheita-pendente") || "null");
      if (pendente) {
        sessionStorage.removeItem("agro-vitao-colheita-pendente");
        abrirConfirmacaoPorVoz({ detail: pendente });
      }
    } catch (erro) {
      console.warn("Não foi possível recuperar a colheita preparada pelo Agro Vitão IA:", erro);
    }
    window.addEventListener("agro-vitao-confirmar-colheita", abrirConfirmacaoPorVoz);
    return () => window.removeEventListener("agro-vitao-confirmar-colheita", abrirConfirmacaoPorVoz);
  }, []);

  // Recarregar quando o ano muda (navegação entre semanas)
  useEffect(() => {
    setLoading(true);
    loadColheitas(anoNav);
  }, [anoNav]);

  const currentWeek = moment().isoWeek();
  const currentYear = moment().year();

  function navigateWeek(dir) {
    let s = semanaNav + dir;
    let a = anoNav;
    if (s < 1) { a -= 1; s = moment(`${a}-12-31`).isoWeek(); }
    else if (s > moment(`${a}-12-28`).isoWeek()) { a += 1; s = 1; }
    setSemanaNav(s);
    setAnoNav(a);
  }

  function getWeekDates(sem, ano) {
    const start = moment().year(ano).isoWeek(sem).startOf('isoWeek');
    const end = moment().year(ano).isoWeek(sem).endOf('isoWeek');
    return { start: start.format('DD/MM'), end: end.format('DD/MM') };
  }

  // Filtra colheitas da semana navegada
  const filtradas = colheitas.filter((c) => {
    if (c.semana !== semanaNav) return false;
    if (filtroEstufa !== "todas" && c.estufa.toString() !== filtroEstufa) return false;
    if (buscaVariedade && !c.variedade.toLowerCase().includes(buscaVariedade.toLowerCase())) return false;
    if (filtroCor !== "todas" && getCorVariedade(c.variedade) !== filtroCor) return false;
    return true;
  });

  // Stats gerais (todas as semanas, sem filtro de semana)
  const todasFiltradas = colheitas.filter((c) => {
    if (filtroEstufa !== "todas" && c.estufa.toString() !== filtroEstufa) return false;
    if (buscaVariedade && !c.variedade.toLowerCase().includes(buscaVariedade.toLowerCase())) return false;
    return true;
  });

  // Separar flores principais (Crisântemo/Anastasia) das flores fixas (Statice/Limonium/Girassol)
  const filtradasPrincipais = filtradas.filter(c => !isFloraFixa(c.variedade));
  const filtradasFixas = filtradas.filter(c => isFloraFixa(c.variedade));

  const totalCestos = filtradasPrincipais.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalHastesTotal = filtradasPrincipais.reduce((s, c) => s + getHastesColheita(c), 0);
  const totalCestosFixas = filtradasFixas.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalHastesFixas = filtradasFixas.reduce((s, c) => s + getHastesColheita(c), 0);

  // Totais por tipo de flora fixa
  // Statice: Sinzii* e Tasmania Rose
  const NOMES_STATICE = ['sinzii', 'tasmania'];
  const filtradasStatice = filtradasFixas.filter(c => isVariedadeFixa(c.variedade) && NOMES_STATICE.some(n => (c.variedade || '').toLowerCase().includes(n)));
  // Limonium: Klara, Piuma, Shooting Star, Oshi, Supreme
  const filtradasLimonium = filtradasFixas.filter(c => isVariedadeFixa(c.variedade) && !NOMES_STATICE.some(n => (c.variedade || '').toLowerCase().includes(n)));
  const filtradasGirassol = filtradasFixas.filter(c => isVariedadeGirassol(c.variedade));
  const statice = { cestos: filtradasStatice.reduce((s,c)=>s+(c.cestos||0),0), hastes: filtradasStatice.reduce((s,c)=>s+getHastesColheita(c),0) };
  const limonium = { cestos: filtradasLimonium.reduce((s,c)=>s+(c.cestos||0),0), hastes: filtradasLimonium.reduce((s,c)=>s+getHastesColheita(c),0) };
  const girassol = { cestos: filtradasGirassol.reduce((s,c)=>s+(c.cestos||0),0), hastes: filtradasGirassol.reduce((s,c)=>s+getHastesColheita(c),0) };
  const hojeCount = todasFiltradas.filter((c) => moment(c.data_colheita).isSame(moment(), "day") && !isFloraFixa(c.variedade)).length;

  // Meta: apenas flores principais (sem Statice/Limonium/Girassol)
  const colhidoSemanaAtual = filtradasPrincipais.reduce((s, c) => s + getHastesColheita(c), 0);
  const previstoSemana = previsoes
    .filter(p => p.semana === semanaNav && p.ano === anoNav && !isFloraFixa(p.variedade))
    .reduce((s, p) => s + ((p.hastes_previstas ?? p.pressas_previstas) || 0), 0);
  const pctMeta = previstoSemana > 0 ? Math.round((colhidoSemanaAtual / previstoSemana) * 100) : 0;

  // Weekly trend data (last 8 weeks) — barras separadas para flores principais e fixas
  const weeklyTrend = [];
  for (let i = 7; i >= 0; i--) {
    const w = currentWeek - i;
    const wLabel = `S${w > 0 ? w : w + 52}`;
    const wPrincipais = colheitas.filter((c) => c.semana === (w > 0 ? w : w + 52) && !isFloraFixa(c.variedade));
    const wFixas = colheitas.filter((c) => c.semana === (w > 0 ? w : w + 52) && isFloraFixa(c.variedade));
    weeklyTrend.push({
      semana: wLabel,
      cestos: wPrincipais.reduce((s, c) => s + (c.cestos || 0), 0),
      hastes: wPrincipais.reduce((s, c) => s + getHastesColheita(c), 0),
      hastesFixas: wFixas.reduce((s, c) => s + getHastesColheita(c), 0),
    });
  }

  const groupedByDate = filtradas.reduce((acc, c) => {
    const key = c.data_colheita;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  function handleEdit(colheita) {
    setEditingColheita(colheita);
    setDialogOpen(true);
  }

  function handleDelete(id) {
    setDeleteDialog({ open: true, id });
  }

  async function confirmDelete() {
    try {
      await colheitasAPI.delete(deleteDialog.id);
      toast.success("Colheita excluída com sucesso!");
      loadColheitas();
    } catch (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingColheita(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Scissors className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Colheita</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe as colheitas</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-sm flex-1 sm:flex-none">
            <Plus className="w-4 h-4" /> Nova Colheita
          </Button>
          <Button variant="outline" onClick={() => setLoteDialogOpen(true)} className="gap-2 shadow-sm flex-1 sm:flex-none">
            <Scissors className="w-4 h-4" /> Em Lote
          </Button>
        </div>
      </div>

      {/* Navegador de semanas */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xl font-bold">Semana {semanaNav}</p>
            <p className="text-xs text-muted-foreground">{getWeekDates(semanaNav, anoNav).start} — {getWeekDates(semanaNav, anoNav).end} / {anoNav}</p>
            {semanaNav === currentWeek && anoNav === currentYear && (
              <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">Semana atual</span>
            )}
          </div>
          <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg hover:bg-muted transition-colors" disabled={semanaNav === currentWeek && anoNav === currentYear}>
            <ChevronRight className={`w-5 h-5 ${semanaNav === currentWeek && anoNav === currentYear ? 'opacity-30' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Cestos" value={totalCestos.toLocaleString("pt-BR")} />
        <StatCard icon={TrendingUp} label="Hastes" value={totalHastesTotal.toLocaleString("pt-BR")} color="text-green-600" />
        <StatCard icon={Target} label="Registros" value={filtradasPrincipais.length} />
        <StatCard icon={Calendar} label="Hoje" value={hojeCount} sub="colheitas" />
      </div>

      {/* Card separado para Statice/Limonium/Girassol */}
      {(totalHastesFixas > 0 || totalCestosFixas > 0) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-800">🌿 Flores Fixas — Semana {semanaNav}</p>
            <p className="text-xs text-emerald-600">Fora da meta principal</p>
          </div>
          <div className="divide-y divide-emerald-100">
            {(statice.hastes > 0 || statice.cestos > 0) && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-emerald-800">Statice</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">{statice.hastes.toLocaleString("pt-BR")} hastes</span>
                  {statice.cestos > 0 && <span className="text-xs text-emerald-600 ml-2">({statice.cestos} cestos)</span>}
                </div>
              </div>
            )}
            {(limonium.hastes > 0 || limonium.cestos > 0) && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-emerald-800">Limonium</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">{limonium.hastes.toLocaleString("pt-BR")} hastes</span>
                  {limonium.cestos > 0 && <span className="text-xs text-emerald-600 ml-2">({limonium.cestos} cestos)</span>}
                </div>
              </div>
            )}
            {(girassol.hastes > 0 || girassol.cestos > 0) && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-emerald-800">Girassol</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">{girassol.hastes.toLocaleString("pt-BR")} hastes</span>
                  {girassol.cestos > 0 && <span className="text-xs text-emerald-600 ml-2">({girassol.cestos} cestos)</span>}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-600 font-semibold">Total</span>
              <span className="text-sm font-bold text-emerald-700">{totalHastesFixas.toLocaleString("pt-BR")} hastes · {totalCestosFixas} cestos</span>
            </div>
          </div>
        </div>
      )}

      {/* Resumo por Destino — semana navegada */}
      {filtradas.length > 0 && (() => {
        const DESTINO_STYLE = {
          "Barracão":  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-800",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
          "Mercado":   { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500" },
          "Oferta 60": { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-800",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
          "Oferta 80": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
        };
        const ORDEM = ["Barracão", "Mercado", "Oferta 60", "Oferta 80"];

        function buildPorDestino(lista) {
          const map = {};
          lista.forEach(c => {
            const d = c.destino || "Outros";
            if (!map[d]) map[d] = { hastes: 0, cestos: 0 };
            map[d].hastes += getHastesColheita(c);
            map[d].cestos += c.cestos || 0;
          });
          return map;
        }

        function DestinoCards({ titulo, lista, cor = "text-foreground", headerClass = "" }) {
          const porDestino = buildPorDestino(lista);
          const totalH = Object.values(porDestino).reduce((s, v) => s + v.hastes, 0);
          const totalC = Object.values(porDestino).reduce((s, v) => s + v.cestos, 0);
          if (totalH === 0 && totalC === 0) return null;
          // Se hastes zerado mas tem cestos, usar cestos como referência
          const refTotal = totalH > 0 ? totalH : totalC;
          const destinosPresentes = [
            ...ORDEM.filter(d => porDestino[d]),
            ...Object.keys(porDestino).filter(d => !ORDEM.includes(d)),
          ];
          return (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${cor} ${headerClass}`}>{titulo} — Semana {semanaNav}</p>
                <span className="text-xs text-muted-foreground">{totalH.toLocaleString("pt-BR")} hastes · {totalC} cestos</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {destinosPresentes.map(dest => {
                  const s = DESTINO_STYLE[dest] || { bg: "bg-muted", border: "border-border", text: "text-foreground", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
                  const v = porDestino[dest];
                  const pct = refTotal > 0 ? Math.round(((v.hastes || v.cestos) / refTotal) * 100) : 0;
                  return (
                    <div key={dest} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                        <span className={`text-xs font-semibold ${s.text}`}>{dest}</span>
                      </div>
                      <p className={`text-xl font-bold ${s.text}`}>{(v.hastes || v.cestos || 0).toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">{v.hastes > 0 ? "hastes" : "cestos"}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">{v.cestos} cestos</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.badge}`}>{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        const principais = filtradas.filter(c => !isFloraFixa(c.variedade));
        const staticeList = filtradas.filter(c => isVariedadeFixa(c.variedade) && ['sinzii','tasmania'].some(n => (c.variedade||'').toLowerCase().includes(n)));
        const limoniumList = filtradas.filter(c => isVariedadeFixa(c.variedade) && !['sinzii','tasmania'].some(n => (c.variedade||'').toLowerCase().includes(n)));
        const girassolList = filtradas.filter(c => isVariedadeGirassol(c.variedade));

        return (
          <DestinoCards titulo="🌸 Flores Principais" lista={principais} cor="text-primary" />
        );
      })()}

      {/* Weekly trend chart */}
      <div className="bg-card border rounded-xl p-4">
        <p className="text-sm font-semibold mb-3 text-foreground">Tendência Semanal — Últimas 8 Semanas</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyTrend} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(val, name) => [val.toLocaleString("pt-BR"), name === "cestos" ? "Cestos" : name === "hastesFixas" ? "Hastes Fixas" : "Hastes"]} />
            <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="cestos" />
            <Bar dataKey="hastes" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} name="hastes" />
            <Bar dataKey="hastesFixas" fill="#10b981" radius={[3, 3, 0, 0]} name="hastesFixas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por variedade..."
          value={buscaVariedade}
          onChange={(e) => setBuscaVariedade(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {buscaVariedade && (
          <button onClick={() => setBuscaVariedade("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
        )}
      </div>

      {/* Meta da semana */}
      {previstoSemana > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Meta da Semana {currentWeek}</p>
            <span className={`text-xl font-bold ${
              pctMeta >= 100 ? "text-green-600" : 
              pctMeta >= 75 ? "text-amber-600" : 
              "text-red-600"
            }`}>{pctMeta}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Colhido</span>
              <span className="font-semibold">{colhidoSemanaAtual.toLocaleString("pt-BR")} hastes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Previsto</span>
              <span className="font-semibold">{previstoSemana.toLocaleString("pt-BR")} hastes</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                pctMeta >= 100 ? "bg-green-500" :
                pctMeta >= 75 ? "bg-amber-500" :
                "bg-red-500"
              }`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
            </div>
            {pctMeta < 100 && (
              <p className="text-xs text-muted-foreground text-right">
                Faltam {(previstoSemana - colhidoSemanaAtual).toLocaleString("pt-BR")} hastes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gráfico de Cores Colhidas */}
      {filtradas.length > 0 && (() => {
        const itensCores = agruparPorCor(
          filtradas.map(c => ({ variedade: c.variedade, quantidade: (c.hastes ?? c.pressas) || 0 }))
        );
        const totalCores = itensCores.reduce((s, c) => s + c.total, 0);
        return (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-3 text-foreground">🎨 Colhido por Cor — Semana {semanaNav}</p>
            <div className="space-y-2">
              {itensCores.map(({ cor, total }) => {
                const paleta = PALETA_CORES[cor] || PALETA_CORES["Indefinida"];
                const pct = totalCores > 0 ? Math.round((total / totalCores) * 100) : 0;
                return (
                  <div key={cor} className="flex items-center gap-3">
                    <div className="w-24 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: paleta.light, color: paleta.bg, border: `1.5px solid ${paleta.bg}` }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: paleta.bg }} />
                        {cor}
                      </span>
                    </div>
                    <div className="flex-1 h-5 rounded-full overflow-hidden bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: paleta.bg }} />
                    </div>
                    <div className="w-32 text-right text-xs font-semibold text-muted-foreground">
                      {total.toLocaleString("pt-BR")} hastes <span className="text-muted-foreground/60">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Filter tabs — Estufa */}
      <div className="flex gap-2 flex-wrap">
        {["todas", "1", "2", "3", "4"].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstufa(e)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filtroEstufa === e
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {e === "todas" ? "Todas" : `Estufa ${e}`}
          </button>
        ))}
      </div>

      {/* Filtro de Cor */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filtrar por cor:</span>
        <button
          onClick={() => setFiltroCor("todas")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            filtroCor === "todas"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          Todas
        </button>
        {Object.keys(PALETA_CORES).filter(c => c !== "Indefinida").map((cor) => {
          const paleta = PALETA_CORES[cor];
          const ativo = filtroCor === cor;
          return (
            <button
              key={cor}
              onClick={() => setFiltroCor(ativo ? "todas" : cor)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={ativo
                ? { backgroundColor: paleta.bg, color: "#fff", borderColor: paleta.bg }
                : { backgroundColor: paleta.light, color: paleta.bg, borderColor: paleta.bg }
              }
            >
              {cor}
            </button>
          );
        })}
      </div>

      {/* Timeline by date — agrupado por destino */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma colheita registrada</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const registros = groupedByDate[date];
            const cestosDia = registros.reduce((s, c) => s + (c.cestos || 0), 0);
            const hastesDia = registros.reduce((s, c) => s + getHastesColheita(c), 0);

            // Agrupar por destino normalizado
            const ORDEM_DESTINOS = ["Barracão", "Mercado", "Oferta 60", "Oferta 80"];
            const DESTINO_SECTION_STYLE = {
              "Barracão":  { header: "bg-blue-50 border-blue-200",   title: "text-blue-800",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500",   card: "border-blue-100 hover:border-blue-300" },
              "Mercado":   { header: "bg-green-50 border-green-200",  title: "text-green-800",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500",  card: "border-green-100 hover:border-green-300" },
              "Oferta 60": { header: "bg-amber-50 border-amber-200",  title: "text-amber-800",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500",  card: "border-amber-100 hover:border-amber-300" },
              "Oferta 80": { header: "bg-orange-50 border-orange-200",title: "text-orange-800", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", card: "border-orange-100 hover:border-orange-300" },
            };
            const DEFAULT_STYLE = { header: "bg-muted border-border", title: "text-foreground", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground", card: "border-border hover:border-primary/30" };

            // Montar grupos
            const porDestino = {};
            registros.forEach(c => {
              const d = c.destino || "Outros";
              if (!porDestino[d]) porDestino[d] = [];
              porDestino[d].push(c);
            });
            const destinosPresentes = [
              ...ORDEM_DESTINOS.filter(d => porDestino[d]),
              ...Object.keys(porDestino).filter(d => !ORDEM_DESTINOS.includes(d)),
            ];

            return (
              <div key={date}>
                {/* Cabeçalho do dia */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-base font-bold text-foreground">
                    {moment(date).format("DD [de] MMMM")}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {cestosDia} cestos · {hastesDia.toLocaleString("pt-BR")} hastes
                  </span>
                </div>

                {/* Seções por destino */}
                <div className="space-y-4">
                  {destinosPresentes.map(destino => {
                    const regs = porDestino[destino];
                    const s = DESTINO_SECTION_STYLE[destino] || DEFAULT_STYLE;
                    const totalC = regs.reduce((sum, c) => sum + (c.cestos || 0), 0);
                    const totalH = regs.reduce((sum, c) => sum + getHastesColheita(c), 0);
                    return (
                      <div key={destino} className={`rounded-xl border overflow-hidden`}>
                        {/* Header do destino */}
                        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${s.header}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                            <span className={`text-sm font-bold ${s.title}`}>{destino}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>
                              {regs.length} registro{regs.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${s.title}`}>{totalH.toLocaleString("pt-BR")} hastes</span>
                            <span className="text-xs text-muted-foreground ml-2">· {totalC} cestos</span>
                          </div>
                        </div>

                        {/* Registros do destino */}
                        <div className="divide-y divide-border bg-card">
                          {regs.map((c) => (
                            <div key={c.id} className={`flex items-center gap-3 px-4 py-3 transition-colors group hover:bg-muted/30`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{normalizarVariedade(c.variedade)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  E{c.estufa} {c.lado} · V{c.vao}-C{c.canteiro} · Sem. {c.semana}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-sm">{getHastesColheita(c).toLocaleString("pt-BR")} hastes</p>
                                <p className="text-xs text-muted-foreground">{c.cestos || 0} cestos</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(c)} className="h-8 w-8 p-0">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
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

      <ColheitaLoteDialog
        open={loteDialogOpen}
        onClose={() => setLoteDialogOpen(false)}
        onSaved={loadColheitas}
      />
      <ColheitaWizard 
        open={dialogOpen} 
        onClose={() => { handleCloseDialog(); setVozColheitaInicial(null); }}
        onSaved={async () => { await loadColheitas(); setVozColheitaInicial(null); }}
        editingColheita={editingColheita}
        initialForm={vozColheitaInicial}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta colheita? Esta ação não pode ser desfeita.
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
