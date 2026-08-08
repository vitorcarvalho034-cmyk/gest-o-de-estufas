import { useState, useEffect, useMemo } from "react";
import { colheitasAPI, descartesAPI, plantiosAPI } from "@/api/supabaseClient";
import { normalizarVariedade } from "@/lib/coresVariedades";
import { BarChart3, TrendingUp, TrendingDown, Award, Leaf, Scissors, Trash2, Ruler, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = [
  "hsl(152, 45%, 32%)", "hsl(42, 80%, 55%)", "hsl(200, 60%, 45%)",
  "hsl(340, 65%, 55%)", "hsl(270, 50%, 55%)"
];

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const tooltipStyle = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }
};

// Área de um canteiro em m²
const M2_POR_CANTEIRO = 1.20 * 22.70; // = 27.24 m²

// Normaliza nome de variedade: resolve aliases (CAL.PINK→Calimero Pink, Desb.*→Anastasia *)
// e retorna chave lowercase para agrupamento sem duplicidade
function normVar(v) {
  return normalizarVariedade(v || "").toLowerCase().trim().replace(/\s+/g, " ");
}
// Retorna o nome de exibição canônico (capitalizado corretamente)
function displayVar(v) {
  return normalizarVariedade(v || "") || v;
}

// ─── Componente: Produtividade Semanal ────────────────────────────────────────
function ProdutividadeSemanal({ colheitas, descartes, plantios }) {
  // Descobrir todas as semanas com colheita
  const semanas = useMemo(() => {
    const set = new Set();
    colheitas.forEach(c => {
      if (c.data_colheita) {
        const m = moment(c.data_colheita);
        set.add(`${m.isoWeekYear()}-${String(m.isoWeek()).padStart(2, '0')}`);
      }
    });
    return [...set].sort().reverse(); // mais recente primeiro
  }, [colheitas]);

  const semanaAtual = semanas[0] || `${moment().isoWeekYear()}-${String(moment().isoWeek()).padStart(2, '0')}`;
  const [semanaSel, setSemanaSel] = useState(semanaAtual);

  // Atualiza seleção quando dados mudam
  useEffect(() => {
    if (semanas.length > 0 && !semanas.includes(semanaSel)) {
      setSemanaSel(semanas[0]);
    }
  }, [semanas]);

  const idxSel = semanas.indexOf(semanaSel);

  // Colheitas da semana selecionada
  const colheitasSemana = useMemo(() => {
    return colheitas.filter(c => {
      if (!c.data_colheita) return false;
      const m = moment(c.data_colheita);
      const key = `${m.isoWeekYear()}-${String(m.isoWeek()).padStart(2, '0')}`;
      return key === semanaSel;
    });
  }, [colheitas, semanaSel]);

  // Agrupar por variedade na semana
  const byVar = useMemo(() => {
    const map = {};
    colheitasSemana.forEach(c => {
      const k = normVar(c.variedade);
      if (!map[k]) map[k] = { name: displayVar(c.variedade), hastes: 0, cestos: 0 };
      map[k].hastes += c.hastes || 0;
      map[k].cestos += c.cestos || 0;
    });
    return Object.values(map).sort((a, b) => b.hastes - a.hastes);
  }, [colheitasSemana]);

  // Totais da semana
  const totalHastesSemana = colheitasSemana.reduce((s, c) => s + ((c.hastes ?? c.pressas) || 0), 0);
  const totalCestosSemana = colheitasSemana.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalDescartesSemana = descartes.filter(d => {
    if (!d.data_descarte) return false;
    const m = moment(d.data_descarte);
    const key = `${m.isoWeekYear()}-${String(m.isoWeek()).padStart(2, '0')}`;
    return key === semanaSel;
  }).reduce((s, d) => s + (d.quantidade || 0), 0);

  // Evolução semanal (todas as semanas) para gráfico
  const evolucao = useMemo(() => {
    const map = {};
    colheitas.forEach(c => {
      if (!c.data_colheita) return;
      const m = moment(c.data_colheita);
      const key = `${m.isoWeekYear()}-${String(m.isoWeek()).padStart(2, '0')}`;
      if (!map[key]) map[key] = { semana: `S${m.isoWeek()}`, key, hastes: 0, cestos: 0 };
      map[key].hastes += c.hastes || 0;
      map[key].cestos += c.cestos || 0;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [colheitas]);

  // Label da semana selecionada
  const [ano, semNum] = semanaSel.split('-');
  const inicioSemana = moment().isoWeekYear(parseInt(ano)).isoWeek(parseInt(semNum)).startOf('isoWeek').format('DD/MM');
  const fimSemana = moment().isoWeekYear(parseInt(ano)).isoWeek(parseInt(semNum)).endOf('isoWeek').format('DD/MM');

  return (
    <div className="space-y-4">
      {/* Seletor de semana */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => idxSel < semanas.length - 1 && setSemanaSel(semanas[idxSel + 1])}
              disabled={idxSel >= semanas.length - 1}
              className="p-2 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-bold text-lg">Semana {semNum}/{ano}</span>
              </div>
              <p className="text-xs text-muted-foreground">{inicioSemana} a {fimSemana}</p>
            </div>

            <button
              onClick={() => idxSel > 0 && setSemanaSel(semanas[idxSel - 1])}
              disabled={idxSel <= 0}
              className="p-2 rounded-lg border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Totais da semana */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center bg-primary/5 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Hastes Colhidas</p>
              <p className="text-xl font-bold text-primary">{totalHastesSemana.toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-center bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cestos</p>
              <p className="text-xl font-bold text-amber-700">{totalCestosSemana.toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Descartadas</p>
              <p className="text-xl font-bold text-destructive">{totalDescartesSemana.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela por variedade na semana */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            Colheita por Variedade — Semana {semNum}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {byVar.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma colheita registrada nesta semana</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-3">Variedade</th>
                  <th className="text-right py-2 px-2 text-primary">Hastes</th>
                  <th className="text-right py-2 px-2 text-amber-700">Cestos</th>
                  <th className="text-right py-2 px-2 text-muted-foreground">% do total</th>
                </tr>
              </thead>
              <tbody>
                {byVar.map((v) => {
                  const pct = totalHastesSemana > 0 ? Math.round((v.hastes / totalHastesSemana) * 100) : 0;
                  return (
                    <tr key={v.name} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-3 font-medium">{v.name}</td>
                      <td className="text-right py-2 px-2 text-primary font-semibold">{v.hastes.toLocaleString('pt-BR')}</td>
                      <td className="text-right py-2 px-2 text-amber-700 font-semibold">{v.cestos}</td>
                      <td className="text-right py-2 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="text-right py-2 px-2 text-primary">{totalHastesSemana.toLocaleString('pt-BR')}</td>
                  <td className="text-right py-2 px-2 text-amber-700">{totalCestosSemana}</td>
                  <td className="text-right py-2 px-2"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de evolução semanal */}
      {evolucao.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução Semanal — Hastes Colhidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, name) => [v.toLocaleString('pt-BR'), name === 'hastes' ? 'Hastes' : 'Cestos']}
                />
                <Legend />
                <Bar
                  dataKey="hastes"
                  name="Hastes"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  // Destaca a semana selecionada
                  label={false}
                />
                <Bar dataKey="cestos" name="Cestos" fill="hsl(42, 80%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Seletor de semana (dropdown) para navegação rápida */}
      {semanas.length > 1 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">Ir para semana:</span>
              <select
                value={semanaSel}
                onChange={e => setSemanaSel(e.target.value)}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm bg-background"
              >
                {semanas.map(s => {
                  const [a, n] = s.split('-');
                  const ini = moment().isoWeekYear(parseInt(a)).isoWeek(parseInt(n)).startOf('isoWeek').format('DD/MM');
                  const fim = moment().isoWeekYear(parseInt(a)).isoWeek(parseInt(n)).endOf('isoWeek').format('DD/MM/YY');
                  return <option key={s} value={s}>Semana {n}/{a} ({ini}–{fim})</option>;
                })}
              </select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Produtividade() {
  const [colheitas, setColheitas] = useState([]);
  const [descartes, setDescartes] = useState([]);
  const [plantios, setPlantios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstufa, setFilterEstufa] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [col, desc, pla] = await Promise.all([
          colheitasAPI.list(1000),
          descartesAPI.list(1000),
          plantiosAPI.list(1000),
        ]);
        setColheitas(col);
        setDescartes(Array.isArray(desc) ? desc : []);
        setPlantios(Array.isArray(pla) ? pla : []);
      } catch (e) {
        console.warn('Produtividade load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filterEstufa === "all"
    ? colheitas
    : colheitas.filter((c) => c.estufa === parseInt(filterEstufa));

  const filteredDescartes = filterEstufa === "all"
    ? descartes
    : descartes.filter((d) => d.estufa === parseInt(filterEstufa));

  const filteredPlantios = filterEstufa === "all"
    ? plantios
    : plantios.filter((p) => p.estufa === parseInt(filterEstufa));

  // ── Por variedade: colhido + plantado + descartado + m² ──────────────────────
  const byVariedade = {};

  // Colhido
  filtered.forEach((c) => {
    const k = normVar(c.variedade);
    if (!byVariedade[k]) byVariedade[k] = { name: displayVar(c.variedade), cestos: 0, hastes: 0, mudas_plantadas: 0, mudas_descartadas: 0, canteiros: new Set() };
    byVariedade[k].cestos += c.cestos || 0;
    byVariedade[k].hastes += c.hastes || 0;
    // Registrar canteiro único para cálculo de m²
    const canteiroKey = `${c.estufa}-${c.lado}-${c.vao}-${c.canteiro}`;
    byVariedade[k].canteiros.add(canteiroKey);
  });

  // Plantado
  filteredPlantios.forEach((p) => {
    const k = normVar(p.variedade);
    if (!byVariedade[k]) byVariedade[k] = { name: displayVar(p.variedade), cestos: 0, hastes: 0, mudas_plantadas: 0, mudas_descartadas: 0, canteiros: new Set() };
    byVariedade[k].mudas_plantadas += p.quantidade || 0;
  });

  // Descartado
  filteredDescartes.forEach((d) => {
    const k = normVar(d.variedade);
    if (!byVariedade[k]) byVariedade[k] = { name: displayVar(d.variedade), cestos: 0, hastes: 0, mudas_plantadas: 0, mudas_descartadas: 0, canteiros: new Set() };
    byVariedade[k].mudas_descartadas += d.quantidade || 0;
  });

  // Calcular m² e produtividade/m²
  const variedadeData = Object.values(byVariedade).map((v) => {
    const nCanteiros = v.canteiros.size || 1;
    const areaM2 = nCanteiros * M2_POR_CANTEIRO;
    const prodM2 = areaM2 > 0 ? Math.round((v.hastes / areaM2) * 10) / 10 : 0;
    const taxaDescarte = v.mudas_plantadas > 0 ? Math.round((v.mudas_descartadas / v.mudas_plantadas) * 100) : 0;
    const taxaProdutividade = v.mudas_plantadas > 0 ? Math.round((v.hastes / v.mudas_plantadas) * 100) : null;
    return {
      ...v,
      canteiros: nCanteiros,
      areaM2: Math.round(areaM2 * 10) / 10,
      prodM2,
      taxaDescarte,
      taxaProdutividade,
    };
  }).sort((a, b) => b.hastes - a.hastes);

  const topVariedades = variedadeData.slice(0, 5);
  const bottomVariedades = [...variedadeData].filter(v => v.hastes > 0).reverse().slice(0, 5);
  const topProdM2 = [...variedadeData].filter(v => v.hastes > 0 && v.areaM2 > 0).sort((a, b) => b.prodM2 - a.prodM2).slice(0, 10);

  // ── Por destino ──────────────────────────────────────────────────────────────
  const byDestino = {};
  filtered.forEach((c) => {
    if (!byDestino[c.destino]) byDestino[c.destino] = 0;
    byDestino[c.destino] += c.cestos || 0;
  });
  const destinoData = Object.entries(byDestino).map(([name, value]) => ({ name, value }));

  // ── Por estufa ───────────────────────────────────────────────────────────────
  const byEstufa = {};
  colheitas.forEach((c) => {
    const key = `Estufa ${c.estufa}`;
    if (!byEstufa[key]) byEstufa[key] = { cestos: 0, hastes: 0, descartes: 0 };
    byEstufa[key].cestos += c.cestos || 0;
    byEstufa[key].hastes += c.hastes || 0;
  });
  descartes.forEach((d) => {
    const key = `Estufa ${d.estufa}`;
    if (!byEstufa[key]) byEstufa[key] = { cestos: 0, hastes: 0, descartes: 0 };
    byEstufa[key].descartes += d.quantidade || 0;
  });
  const estufaData = Object.entries(byEstufa)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── Por mês ──────────────────────────────────────────────────────────────────
  const byMonth = {};
  filtered.forEach((c) => {
    if (!c.data_colheita) return;
    const d = new Date(c.data_colheita);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { mes: MONTH_NAMES[d.getMonth()], ano: d.getFullYear(), key, cestos: 0, hastes: 0 };
    byMonth[key].cestos += c.cestos || 0;
    byMonth[key].hastes += c.hastes || 0;
  });
  const monthData = Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  const monthLabeled = monthData.map((m) => ({ ...m, label: `${m.mes}/${String(m.ano).slice(2)}` }));

  const totalCestos = filtered.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalHastes = filtered.reduce((s, c) => s + ((c.hastes ?? c.pressas) || 0), 0);
  const totalDescartes = filteredDescartes.reduce((s, d) => s + (d.quantidade || 0), 0);
  const totalPlantadas = filteredPlantios.reduce((s, p) => s + (p.quantidade || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Produtividade</h1>
          </div>
          <p className="text-sm text-muted-foreground">Análise de desempenho — canteiro = 27,24 m²</p>
        </div>
        <Select value={filterEstufa} onValueChange={setFilterEstufa}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Estufas</SelectItem>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>Estufa {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Scissors className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Hastes Colhidas</p>
            <p className="text-2xl font-bold text-primary">{totalHastes.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">{totalCestos.toLocaleString("pt-BR")} cestos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Leaf className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Mudas Plantadas</p>
            <p className="text-2xl font-bold text-green-600">{totalPlantadas.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">{Object.keys(byVariedade).length} variedades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trash2 className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Descartadas</p>
            <p className="text-2xl font-bold text-destructive">{totalDescartes.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">mudas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Ruler className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Média Hastes/m²</p>
            <p className="text-2xl font-bold text-amber-600">
              {topProdM2.length > 0
                ? (topProdM2.reduce((s, v) => s + v.prodM2, 0) / topProdM2.length).toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">top 10 variedades</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="variedades">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="variedades">Variedades</TabsTrigger>
          <TabsTrigger value="prodm2">Produt. / m²</TabsTrigger>
          <TabsTrigger value="plantado">Plantado × Colhido</TabsTrigger>
          <TabsTrigger value="estufas">Estufas</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="destino">Destino</TabsTrigger>
        </TabsList>

        {/* ── VARIEDADES ── */}
        <TabsContent value="variedades" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Top 5 Mais Produtivas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topVariedades.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {topVariedades.map((v, i) => (
                      <div key={v.name} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: COLORS[i % COLORS.length], color: "white" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate">{v.name}</span>
                            <span className="text-muted-foreground ml-2">{v.hastes.toLocaleString("pt-BR")} hastes</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${topVariedades[0].hastes ? (v.hastes / topVariedades[0].hastes) * 100 : 0}%`,
                              background: COLORS[i % COLORS.length]
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" /> 5 Menos Produtivas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottomVariedades.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {bottomVariedades.map((v, i) => (
                      <div key={v.name} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate">{v.name}</span>
                            <span className="text-muted-foreground ml-2">{v.hastes.toLocaleString("pt-BR")} hastes</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-destructive/50 rounded-full" style={{
                              width: `${variedadeData[0]?.hastes ? (v.hastes / variedadeData[0].hastes) * 100 : 0}%`
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as Variedades — Hastes Colhidas</CardTitle>
            </CardHeader>
            <CardContent>
              {variedadeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(variedadeData.length * 32, 200)}>
                  <BarChart data={variedadeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v, name) => [v.toLocaleString("pt-BR"), name === "hastes" ? "Hastes" : "Cestos"]} />
                    <Bar dataKey="hastes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="hastes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRODUTIVIDADE / m² ── */}
        <TabsContent value="prodm2" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="w-4 h-4 text-amber-600" /> Produtividade por m² — Top 10 Variedades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProdM2.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(topProdM2.length * 40, 200)}>
                  <BarChart data={topProdM2} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" unit=" h/m²" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v} hastes/m²`, "Produtividade"]} />
                    <Bar dataKey="prodM2" fill="hsl(42, 80%, 55%)" radius={[0, 4, 4, 0]} name="prodM2" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabela detalhada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabela Detalhada — Todas as Variedades com Colheita</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {variedadeData.filter(v => v.hastes > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-3">Variedade</th>
                      <th className="text-right py-2 px-2">Canteiros</th>
                      <th className="text-right py-2 px-2">Área (m²)</th>
                      <th className="text-right py-2 px-2">Hastes</th>
                      <th className="text-right py-2 px-2 font-bold text-amber-700">Hastes/m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variedadeData.filter(v => v.hastes > 0).sort((a, b) => b.prodM2 - a.prodM2).map((v) => (
                      <tr key={v.name} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-3 font-medium">{v.name}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">{v.canteiros}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">{v.areaM2}</td>
                        <td className="text-right py-2 px-2">{v.hastes.toLocaleString("pt-BR")}</td>
                        <td className="text-right py-2 px-2 font-bold text-amber-700">{v.prodM2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRODUTIVIDADE SEMANAL ── */}
        <TabsContent value="plantado">
          <ProdutividadeSemanal
            colheitas={filtered}
            descartes={filteredDescartes}
            plantios={filteredPlantios}
          />
        </TabsContent>

        {/* ── ESTUFAS ── */}
        <TabsContent value="estufas" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {estufaData.map((e) => (
              <Card key={e.name}>
                <CardContent className="p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">{e.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{e.cestos}</p>
                  <p className="text-xs text-muted-foreground">cestos</p>
                  <p className="text-xs text-muted-foreground mt-1">{e.hastes.toLocaleString("pt-BR")} hastes</p>
                  {e.descartes > 0 && <p className="text-xs text-destructive mt-1">{e.descartes} descartados</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparação por Estufa</CardTitle>
            </CardHeader>
            <CardContent>
              {estufaData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={estufaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Bar dataKey="cestos" name="Cestos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="descartes" name="Descartes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MENSAL ── */}
        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colheita por Mês — Cestos & Hastes</CardTitle>
            </CardHeader>
            <CardContent>
              {monthLabeled.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthLabeled}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="cestos" name="Cestos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="hastes" name="Hastes" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DESTINO ── */}
        <TabsContent value="destino">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cestos por Destino</CardTitle>
            </CardHeader>
            <CardContent>
              {destinoData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={destinoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {destinoData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
