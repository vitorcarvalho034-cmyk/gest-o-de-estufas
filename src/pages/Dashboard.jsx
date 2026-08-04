import { useState, useEffect } from "react";
import { canteirosAPI, colheitasAPI, descartesAPI, plantiosAPI } from "@/api/supabaseClient";
import { Sprout, Scissors, Trash2, BarChart3, Warehouse, Flower2, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_VAOS } from "@/lib/estufasConfig";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function StatCard({ icon: Icon, label, value, subtitle, color }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMudas: 0,
    totalCestos: 0,
    totalHastes: 0,
    totalDescartes: 0,
    canteirosAtivos: 0,
  });
  const [estufaStats, setEstufaStats] = useState({});
  const [alertas, setAlertas] = useState([]);
  const [confirmedIds, setConfirmedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("corte_luz_confirmed") || "[]"); } catch { return []; }
  });

  function confirmarCorte(id) {
    const updated = [...confirmedIds, id];
    setConfirmedIds(updated);
    localStorage.setItem("corte_luz_confirmed", JSON.stringify(updated));
  }
  const [weeklyData, setWeeklyData] = useState([]);
  const [topVariedades, setTopVariedades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [canteiros, colheitas, descartes, plantios] = await Promise.all([
          canteirosAPI.list(),
          colheitasAPI.list(1000),
          descartesAPI.list(1000),
          plantiosAPI.list(500),
        ]);

        const safeCanteiros = Array.isArray(canteiros) ? canteiros : [];
        const safeColheitas = Array.isArray(colheitas) ? colheitas : [];
        const safeDescartes = Array.isArray(descartes) ? descartes : [];
        const safePlantios = Array.isArray(plantios) ? plantios : [];

        const totalMudas = safeCanteiros.reduce((sum, c) => sum + (c.total_mudas || 0), 0);
        const canteirosAtivos = safeCanteiros.filter((c) => (c.total_mudas || 0) > 0).length;
        const totalCestos = safeColheitas.reduce((sum, c) => sum + (c.cestos || 0), 0);
        const totalHastes = safeColheitas.reduce((sum, c) => sum + (c.pressas || 0), 0);
        const totalDescartes = safeDescartes.reduce((sum, d) => sum + (d.quantidade || 0), 0);

        // Per-estufa stats
        const estufaMap = {};
        for (let e = 1; e <= 4; e++) {
          const ec = safeCanteiros.filter((c) => c.estufa === e);
          const totalVaos = TOTAL_VAOS[e] * 2; // cada vão tem lado A e B
          const vaosComMudas = new Set(ec.filter((c) => (c.total_mudas || 0) > 0).map((c) => `${c.vao}-${c.lado}`)).size;
          const mudas = ec.reduce((s, c) => s + (c.total_mudas || 0), 0);
          const cestos = safeColheitas.filter((c) => c.estufa === e).reduce((s, c) => s + (c.cestos || 0), 0);
          const hastes = safeColheitas.filter((c) => c.estufa === e).reduce((s, c) => s + (c.pressas || 0), 0);
          const desc = safeDescartes.filter((d) => d.estufa === e).reduce((s, d) => s + (d.quantidade || 0), 0);
          const ocupacao = totalVaos > 0 ? Math.round((vaosComMudas / totalVaos) * 100) : 0;
          estufaMap[e] = { totalVaos, vaosComMudas, mudas, cestos, hastes, desc, ocupacao };
        }
        setEstufaStats(estufaMap);

        // Weekly colheita chart (last 8 weeks)
        const currentWeek = moment().isoWeek();
        const weeklyMap = {};
        for (let i = 7; i >= 0; i--) {
          const w = currentWeek - i;
          const label = `Sem ${w > 0 ? w : w + 52}`;
          weeklyMap[label] = { semana: label, cestos: 0, hastes: 0 };
        }
        safeColheitas.forEach((c) => {
          const label = `Sem ${c.semana}`;
          if (weeklyMap[label]) {
            weeklyMap[label].cestos += c.cestos || 0;
            weeklyMap[label].hastes += c.pressas || 0;
          }
        });
        setWeeklyData(Object.values(weeklyMap));

        // Top variedades
        const varMap = {};
        safeColheitas.forEach((c) => {
          if (!varMap[c.variedade]) varMap[c.variedade] = { variedade: c.variedade, hastes: 0, cestos: 0 };
          varMap[c.variedade].hastes += c.pressas || 0;
          varMap[c.variedade].cestos += c.cestos || 0;
        });
        const top = Object.values(varMap).sort((a, b) => b.hastes - a.hastes).slice(0, 6);
        setTopVariedades(top);

        setStats({ totalMudas, totalCestos, totalHastes, totalDescartes, canteirosAtivos });
        setAlertas([]);
      } catch (e) {
        console.warn('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Flower2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Visão geral das estufas de flores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Sprout}
          label="Total de Mudas"
          value={stats.totalMudas.toLocaleString("pt-BR")}
          subtitle={`${stats.canteirosAtivos} vãos ativos`}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Scissors}
          label="Cestos Colhidos"
          value={stats.totalCestos.toLocaleString("pt-BR")}
          subtitle={`${stats.totalHastes.toLocaleString("pt-BR")} hastes`}
          color="bg-accent/20 text-accent-foreground"
        />
        <StatCard
          icon={Trash2}
          label="Descartes"
          value={stats.totalDescartes.toLocaleString("pt-BR")}
          subtitle="mudas descartadas"
          color="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={Warehouse}
          label="Estufas"
          value="4"
          subtitle="120 vãos"
          color="bg-chart-3/10 text-chart-3"
        />
      </div>

      {/* Weekly harvest chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" /> Colheita Semanal (8 semanas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val, name) => [val.toLocaleString("pt-BR"), name === "cestos" ? "Cestos" : "Hastes"]} />
                <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="cestos" />
                <Bar dataKey="hastes" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} name="hastes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Top Variedades por Produção</CardTitle>
          </CardHeader>
          <CardContent>
            {topVariedades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma colheita registrada</p>
            ) : (
              <div className="space-y-2">
                {topVariedades.map((v, i) => {
                  const maxHastes = topVariedades[0].hastes || 1;
                  const pct = Math.round((v.hastes / maxHastes) * 100);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate max-w-[60%]">{v.variedade}</span>
                        <span className="text-muted-foreground">{v.hastes.toLocaleString("pt-BR")} hastes · {v.cestos} cestos</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Warehouse className="w-5 h-5 text-primary" /> Estrutura das Estufas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((estufa) => {
              const s = estufaStats[estufa] || {};
              const ocupacao = s.ocupacao || 0;
              return (
                <div key={estufa} className="rounded-xl border border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-primary" />
                      <span className="font-bold text-base">Estufa {estufa}</span>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{TOTAL_VAOS[estufa]} vãos</span>
                  </div>

                  {/* Ocupação */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Ocupação</span>
                      <span className="font-semibold">{ocupacao}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${ocupacao}%`, background: ocupacao > 80 ? 'hsl(var(--destructive))' : ocupacao > 50 ? 'hsl(var(--accent))' : 'hsl(var(--primary))' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.vaosComMudas || 0} / {s.totalVaos || 0} vãos ocupados</p>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-primary">{(s.mudas || 0).toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-muted-foreground">mudas</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-chart-2">{s.cestos || 0}</p>
                      <p className="text-[10px] text-muted-foreground">cestos colhidos</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-chart-3">{s.hastes || 0}</p>
                      <p className="text-[10px] text-muted-foreground">hastes</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{s.desc || 0}</p>
                      <p className="text-[10px] text-muted-foreground">descartadas</p>
                    </div>
                  </div>

                  {/* Lados */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["A", "B"].map((lado) => (
                      <div key={lado} className="bg-muted/30 border border-border/50 rounded-lg p-2 text-center">
                        <p className="font-semibold">Lado {lado}</p>
                        <p className="text-muted-foreground">{TOTAL_VAOS[estufa]} vãos</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
