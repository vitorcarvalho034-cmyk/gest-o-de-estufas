import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Scissors, Plus, TrendingUp, Package, Target, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ColheitaWizard from "../components/ColheitaWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";

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

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

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
  const [buscaVariedade, setBuscaVariedade] = useState("");
  const [filtroEstufa, setFiltroEstufa] = useState("todas");
  const [variedadesDisponiveis, setVariedadesDisponiveis] = useState([]);

  const [form, setForm] = useState({
    estufa: "", lado: "", vao: "", canteiro: "",
    variedade: "", destino: "", cestos: "",
    data_colheita: new Date().toISOString().split("T")[0],
  });

  async function loadColheitas() {
    const data = await base44.entities.Colheita.list("-data_colheita", 100);
    const prevs = await base44.entities.PrevisaoColheita.list();
    setColheitas(data);
    setPrevisoes(prevs);
    setLoading(false);
  }

  useEffect(() => { loadColheitas(); }, []);

  // When location changes, fetch canteiro to suggest varieties
  useEffect(() => {
    if (form.estufa && form.lado && form.vao && form.canteiro) {
      base44.entities.Canteiro.filter({
        estufa: parseInt(form.estufa),
        lado: form.lado,
        vao: parseInt(form.vao),
        numero: parseInt(form.canteiro),
      }).then((list) => {
        if (list.length > 0 && list[0].variedades) {
          setVariedadesDisponiveis(list[0].variedades.map((v) => v.nome));
        } else {
          setVariedadesDisponiveis([]);
        }
      });
    } else {
      setVariedadesDisponiveis([]);
    }
  }, [form.estufa, form.lado, form.vao, form.canteiro]);

  function updateForm(field, value) {
    if (field === "estufa") setForm((f) => ({ ...f, estufa: value, lado: "", vao: "", canteiro: "", variedade: "" }));
    else if (field === "lado") setForm((f) => ({ ...f, lado: value, vao: "", canteiro: "", variedade: "" }));
    else if (field === "vao") setForm((f) => ({ ...f, vao: value, canteiro: "", variedade: "" }));
    else setForm((f) => ({ ...f, [field]: value }));
  }

  const pressasPorCesto = form.destino ? DESTINOS[form.destino] : 0;
  const totalPressas = (parseInt(form.cestos) || 0) * pressasPorCesto;
  const currentWeek = moment().isoWeek();

  // Filter and calculate stats
  const filtradas = colheitas.filter((c) => {
    if (filtroEstufa !== "todas" && c.estufa.toString() !== filtroEstufa) return false;
    if (buscaVariedade && !c.variedade.toLowerCase().includes(buscaVariedade.toLowerCase())) return false;
    return true;
  });

  const totalCestos = filtradas.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalPressasTotal = filtradas.reduce((s, c) => s + (c.pressas || 0), 0);
  const hojeCount = filtradas.filter((c) => moment(c.data_colheita).isSame(moment(), "day")).length;

  const colhidoSemanaAtual = filtradas.filter(c => c.semana === currentWeek).reduce((s, c) => s + (c.pressas || 0), 0);
  const previstoSemana = previsoes.reduce((s, p) => s + (p.pressas_previstas || 0), 0);
  const pctMeta = previstoSemana > 0 ? Math.round((colhidoSemanaAtual / previstoSemana) * 100) : 0;

  // Weekly trend data (last 8 weeks)
  const weeklyTrend = [];
  for (let i = 7; i >= 0; i--) {
    const w = currentWeek - i;
    const wLabel = `S${w > 0 ? w : w + 52}`;
    const wColheitas = filtradas.filter((c) => c.semana === (w > 0 ? w : w + 52));
    weeklyTrend.push({ semana: wLabel, cestos: wColheitas.reduce((s, c) => s + (c.cestos || 0), 0), hastes: wColheitas.reduce((s, c) => s + (c.pressas || 0), 0) });
  }

  const groupedByDate = filtradas.reduce((acc, c) => {
    const key = c.data_colheita;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Scissors className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Colheita</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe as colheitas</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nova Colheita
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Cestos" value={totalCestos.toLocaleString("pt-BR")} />
        <StatCard icon={TrendingUp} label="Hastes" value={totalPressasTotal.toLocaleString("pt-BR")} color="text-green-600" />
        <StatCard icon={Target} label="Registros" value={filtradas.length} />
        <StatCard icon={Calendar} label="Hoje" value={hojeCount} sub="colheitas" />
      </div>

      {/* Weekly trend chart */}
      <div className="bg-card border rounded-xl p-4">
        <p className="text-sm font-semibold mb-3 text-foreground">Tendência Semanal — Últimas 8 Semanas</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyTrend} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(val, name) => [val.toLocaleString("pt-BR"), name === "cestos" ? "Cestos" : "Hastes"]} />
            <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="cestos" />
            <Bar dataKey="hastes" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} name="hastes" />
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

      {/* Filter tabs */}
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

      {/* Timeline by date */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma colheita registrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const registros = groupedByDate[date];
            const cestosDia = registros.reduce((s, c) => s + (c.cestos || 0), 0);
            const pressasDia = registros.reduce((s, c) => s + (c.pressas || 0), 0);
            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-sm font-semibold text-foreground">
                    {moment(date).format("DD [de] MMMM")}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{cestosDia} cestos · {pressasDia} hastes</span>
                </div>
                <div className="grid gap-2">
                  {registros.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border hover:border-primary/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{c.variedade}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DESTINO_COLORS[c.destino] || "bg-muted text-muted-foreground"}`}>
                            {c.destino}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          E{c.estufa} {c.lado} · V{c.vao}-C{c.canteiro} · Sem. {c.semana}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm">{c.cestos} cestos</p>
                        <p className="text-xs text-muted-foreground">{c.pressas} hastes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ColheitaWizard open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={loadColheitas} />
    </div>
  );
}