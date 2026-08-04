import { useState, useEffect } from "react";
import { canteirosAPI, colheitasAPI, descartesAPI, plantiosAPI } from "@/api/supabaseClient";
import { Sprout, Scissors, Trash2, BarChart3, Warehouse, Flower2, TrendingUp, TrendingDown, Award, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_VAOS } from "@/lib/estufasConfig";
import moment from "moment";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

function StatCard({ icon: Icon, label, value, subtitle, color, trend }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
            {subtitle && (
              <p className={`text-xs mt-1 ${trend === 'down' ? 'text-destructive' : trend === 'up' ? 'text-primary' : 'text-muted-foreground'}`}>
                {trend === 'down' && <TrendingDown className="inline w-3 h-3 mr-0.5" />}
                {trend === 'up' && <TrendingUp className="inline w-3 h-3 mr-0.5" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMudas: 0, canteirosAtivos: 0, ocupacaoMedia: 0,
    cestosTotal: 0, hastesTotal: 0,
    cestosSemana: 0, hastesSemana: 0, hastesSemanaPrev: 0,
    totalDescartes: 0, taxaDescarte: 0,
    mediaSemanal: 0, melhorSemana: 0,
    colhidoMes: 0, cestosMes: 0,
  });
  const [estufaStats, setEstufaStats] = useState({});
  const [weeklyData, setWeeklyData] = useState([]);
  const [topVariedades, setTopVariedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentWeek = moment().isoWeek();
  const currentYear = moment().year();
  const currentMonth = moment().format("MMMM");

  useEffect(() => {
    async function load() {
      try {
        const [canteiros, colheitas, descartes] = await Promise.all([
          canteirosAPI.list(),
          colheitasAPI.list(2000),
          descartesAPI.list(1000),
        ]);

        const safeCanteiros = Array.isArray(canteiros) ? canteiros : [];
        const safeColheitas = Array.isArray(colheitas) ? colheitas : [];
        const safeDescartes = Array.isArray(descartes) ? descartes : [];

        // Totais gerais
        const totalMudas = safeCanteiros.reduce((s, c) => s + (c.total_mudas || 0), 0);
        const canteirosAtivos = safeCanteiros.filter((c) => (c.total_mudas || 0) > 0).length;
        const totalVaosGeral = Object.values(TOTAL_VAOS).reduce((s, v) => s + v * 2, 0);
        const vaosComMudasGeral = new Set(
          safeCanteiros.filter((c) => (c.total_mudas || 0) > 0).map((c) => `${c.estufa}-${c.vao}-${c.lado}`)
        ).size;
        const ocupacaoMedia = totalVaosGeral > 0 ? Math.round((vaosComMudasGeral / totalVaosGeral) * 100) : 0;

        const cestosTotal = safeColheitas.reduce((s, c) => s + (c.cestos || 0), 0);
        const hastesTotal = safeColheitas.reduce((s, c) => s + (c.pressas || 0), 0);
        const totalDescartes = safeDescartes.reduce((s, d) => s + (d.quantidade || 0), 0);
        const taxaDescarte = totalMudas > 0 ? Math.round((totalDescartes / (totalMudas + totalDescartes)) * 100) : 0;

        // Semana atual e anterior
        const cestosSemana = safeColheitas.filter((c) => c.semana === currentWeek).reduce((s, c) => s + (c.cestos || 0), 0);
        const hastesSemana = safeColheitas.filter((c) => c.semana === currentWeek).reduce((s, c) => s + (c.pressas || 0), 0);
        const hastesSemanaPrev = safeColheitas.filter((c) => c.semana === currentWeek - 1).reduce((s, c) => s + (c.pressas || 0), 0);

        // Média semanal (últimas 12 semanas)
        const semanasMap = {};
        safeColheitas.forEach((c) => {
          if (!semanasMap[c.semana]) semanasMap[c.semana] = 0;
          semanasMap[c.semana] += c.cestos || 0;
        });
        const semanaValues = Object.values(semanasMap);
        const mediaSemanal = semanaValues.length > 0
          ? Math.round(semanaValues.slice(-12).reduce((s, v) => s + v, 0) / Math.min(semanaValues.length, 12))
          : 0;

        // Melhor semana
        const melhorSemana = semanaValues.length > 0
          ? Math.max(...safeColheitas.reduce((acc, c) => {
              const key = c.semana;
              acc[key] = (acc[key] || 0) + (c.pressas || 0);
              return acc;
            }, Object.create(null)) && Object.values(
              safeColheitas.reduce((acc, c) => {
                const key = c.semana;
                acc[key] = (acc[key] || 0) + (c.pressas || 0);
                return acc;
              }, {})
            ))
          : 0;

        // Colhido este mês
        const currentMonthNum = moment().month() + 1;
        const colhidoMesHastes = safeColheitas
          .filter((c) => c.data_colheita && moment(c.data_colheita).month() + 1 === currentMonthNum)
          .reduce((s, c) => s + (c.pressas || 0), 0);
        const cestosMes = safeColheitas
          .filter((c) => c.data_colheita && moment(c.data_colheita).month() + 1 === currentMonthNum)
          .reduce((s, c) => s + (c.cestos || 0), 0);

        // Per-estufa stats
        const estufaMap = {};
        for (let e = 1; e <= 4; e++) {
          const ec = safeCanteiros.filter((c) => c.estufa === e);
          const totalVaos = TOTAL_VAOS[e] * 2;
          const vaosComMudas = new Set(ec.filter((c) => (c.total_mudas || 0) > 0).map((c) => `${c.vao}-${c.lado}`)).size;
          const mudas = ec.reduce((s, c) => s + (c.total_mudas || 0), 0);
          const cestos = safeColheitas.filter((c) => c.estufa === e).reduce((s, c) => s + (c.cestos || 0), 0);
          const hastes = safeColheitas.filter((c) => c.estufa === e).reduce((s, c) => s + (c.pressas || 0), 0);
          const desc = safeDescartes.filter((d) => d.estufa === e).reduce((s, d) => s + (d.quantidade || 0), 0);
          const ocupacao = totalVaos > 0 ? Math.round((vaosComMudas / totalVaos) * 100) : 0;
          estufaMap[e] = { totalVaos, vaosComMudas, mudas, cestos, hastes, desc, ocupacao };
        }
        setEstufaStats(estufaMap);

        // Gráfico de linha — últimas 12 semanas
        const weeklyMap = {};
        for (let i = 11; i >= 0; i--) {
          const w = currentWeek - i;
          const wLabel = w > 0 ? w : w + 52;
          weeklyMap[wLabel] = { semana: `S${wLabel}`, cestos: 0, hastes: 0 };
        }
        safeColheitas.forEach((c) => {
          if (weeklyMap[c.semana]) {
            weeklyMap[c.semana].cestos += c.cestos || 0;
            weeklyMap[c.semana].hastes += c.pressas || 0;
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
        setTopVariedades(Object.values(varMap).sort((a, b) => b.hastes - a.hastes).slice(0, 6));

        // Melhor semana (hastes)
        const semanaHastesMap = {};
        safeColheitas.forEach((c) => {
          semanaHastesMap[c.semana] = (semanaHastesMap[c.semana] || 0) + (c.pressas || 0);
        });
        const melhorSemanaHastes = Object.values(semanaHastesMap).length > 0
          ? Math.max(...Object.values(semanaHastesMap)) : 0;

        setStats({
          totalMudas, canteirosAtivos, ocupacaoMedia,
          cestosTotal, hastesTotal,
          cestosSemana, hastesSemana, hastesSemanaPrev,
          totalDescartes, taxaDescarte,
          mediaSemanal,
          melhorSemana: melhorSemanaHastes,
          colhidoMes: colhidoMesHastes, cestosMes,
        });
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

  const tendenciaHastes = stats.hastesSemanaPrev > 0
    ? Math.round(((stats.hastesSemana - stats.hastesSemanaPrev) / stats.hastesSemanaPrev) * 100)
    : null;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Flower2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Visão geral das estufas — Semana {currentWeek} / {currentYear}</p>
      </div>

      {/* Linha 1: 4 cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Sprout}
          label="Mudas Ativas"
          value={stats.totalMudas.toLocaleString("pt-BR")}
          subtitle={`${stats.canteirosAtivos} canteiros · ${stats.ocupacaoMedia}% ocupação`}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Scissors}
          label="Cestos Esta Semana"
          value={stats.cestosSemana.toLocaleString("pt-BR")}
          subtitle={`${stats.hastesSemana.toLocaleString("pt-BR")} hastes na semana`}
          color="bg-green-100 text-green-700"
        />
        <StatCard
          icon={Trash2}
          label="Taxa de Descarte"
          value={`${stats.taxaDescarte}%`}
          subtitle={`${stats.totalDescartes.toLocaleString("pt-BR")} mudas descartadas`}
          color="bg-destructive/10 text-destructive"
        />
        <StatCard
          icon={TrendingUp}
          label="Média Semanal"
          value={stats.mediaSemanal.toLocaleString("pt-BR")}
          subtitle="cestos/semana · últimas 12 sem."
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Linha 2: 3 cards de desempenho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Target}
          label="Hastes Esta Semana"
          value={stats.hastesSemana.toLocaleString("pt-BR")}
          subtitle={tendenciaHastes !== null
            ? `${tendenciaHastes > 0 ? '+' : ''}${tendenciaHastes}% vs semana anterior`
            : "semana atual"}
          trend={tendenciaHastes !== null ? (tendenciaHastes >= 0 ? 'up' : 'down') : null}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={Award}
          label="Melhor Semana"
          value={stats.melhorSemana.toLocaleString("pt-BR")}
          subtitle="hastes em uma semana"
          color="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          icon={Calendar}
          label="Colhido Este Mês"
          value={stats.colhidoMes.toLocaleString("pt-BR")}
          subtitle={`${stats.cestosMes.toLocaleString("pt-BR")} cestos · ${currentMonth}`}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Gráfico de linha — Tendência 12 semanas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Tendência de Colheita — Últimas 12 Semanas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val, name) => [val.toLocaleString("pt-BR"), name === "cestos" ? "Cestos" : "Hastes"]} />
              <Legend formatter={(val) => val === "hastes" ? "Hastes" : "Cestos"} />
              <Line type="monotone" dataKey="hastes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="hastes" />
              <Line type="monotone" dataKey="cestos" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="cestos" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Variedades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Top Variedades por Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topVariedades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma colheita registrada</p>
          ) : (
            <div className="space-y-2">
              {topVariedades.map((v, i) => {
                const maxHastes = topVariedades[0].hastes || 1;
                const pct = Math.round((v.hastes / maxHastes) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate max-w-[55%]">{v.variedade}</span>
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

      {/* Estrutura das Estufas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary" /> Estrutura das Estufas
          </CardTitle>
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
                      <p className="text-lg font-bold text-chart-3">{(s.hastes || 0).toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-muted-foreground">hastes</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{(s.desc || 0).toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-muted-foreground">descartadas</p>
                    </div>
                  </div>
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
