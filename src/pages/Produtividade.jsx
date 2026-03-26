import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp, TrendingDown, Award } from "lucide-react";
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

export default function Produtividade() {
  const [colheitas, setColheitas] = useState([]);
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstufa, setFilterEstufa] = useState("all");

  useEffect(() => {
    async function load() {
      const [col, desc] = await Promise.all([
        base44.entities.Colheita.list("-created_date", 500),
        base44.entities.Descarte.list("-created_date", 500),
      ]);
      setColheitas(col);
      setDescartes(desc);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filterEstufa === "all"
    ? colheitas
    : colheitas.filter((c) => c.estufa === parseInt(filterEstufa));

  const filteredDescartes = filterEstufa === "all"
    ? descartes
    : descartes.filter((d) => d.estufa === parseInt(filterEstufa));

  // By variedade
  const byVariedade = {};
  filtered.forEach((c) => {
    if (!byVariedade[c.variedade]) byVariedade[c.variedade] = { cestos: 0, pressas: 0 };
    byVariedade[c.variedade].cestos += c.cestos || 0;
    byVariedade[c.variedade].pressas += c.pressas || 0;
  });
  const variedadeData = Object.entries(byVariedade)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.cestos - a.cestos);

  const topVariedades = variedadeData.slice(0, 5);
  const bottomVariedades = [...variedadeData].reverse().slice(0, 5);

  // By destino
  const byDestino = {};
  filtered.forEach((c) => {
    if (!byDestino[c.destino]) byDestino[c.destino] = 0;
    byDestino[c.destino] += c.cestos || 0;
  });
  const destinoData = Object.entries(byDestino).map(([name, value]) => ({ name, value }));

  // By estufa
  const byEstufa = {};
  colheitas.forEach((c) => {
    const key = `Estufa ${c.estufa}`;
    if (!byEstufa[key]) byEstufa[key] = { cestos: 0, pressas: 0, descartes: 0 };
    byEstufa[key].cestos += c.cestos || 0;
    byEstufa[key].pressas += c.pressas || 0;
  });
  descartes.forEach((d) => {
    const key = `Estufa ${d.estufa}`;
    if (!byEstufa[key]) byEstufa[key] = { cestos: 0, pressas: 0, descartes: 0 };
    byEstufa[key].descartes += d.quantidade || 0;
  });
  const estufaData = Object.entries(byEstufa)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // By month
  const byMonth = {};
  filtered.forEach((c) => {
    if (!c.data_colheita) return;
    const d = new Date(c.data_colheita);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { mes: MONTH_NAMES[d.getMonth()], ano: d.getFullYear(), key, cestos: 0, pressas: 0 };
    byMonth[key].cestos += c.cestos || 0;
    byMonth[key].pressas += c.pressas || 0;
  });
  const monthData = Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  const monthLabeled = monthData.map((m) => ({ ...m, label: `${m.mes}/${String(m.ano).slice(2)}` }));

  const totalCestos = filtered.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalPressas = filtered.reduce((s, c) => s + (c.pressas || 0), 0);
  const totalDescartes = filteredDescartes.reduce((s, d) => s + (d.quantidade || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Produtividade</h1>
          </div>
          <p className="text-muted-foreground">Análise de desempenho das estufas</p>
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Cestos Colhidos</p>
            <p className="text-3xl font-bold text-primary">{totalCestos.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">{totalPressas.toLocaleString("pt-BR")} pressas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Variedades</p>
            <p className="text-3xl font-bold">{Object.keys(byVariedade).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Descartes</p>
            <p className="text-3xl font-bold text-destructive">{totalDescartes.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">mudas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="variedades">
        <TabsList className="mb-4">
          <TabsTrigger value="variedades">Variedades</TabsTrigger>
          <TabsTrigger value="estufas">Estufas</TabsTrigger>
          <TabsTrigger value="mensal">Comparação Mensal</TabsTrigger>
          <TabsTrigger value="destino">Destino</TabsTrigger>
        </TabsList>

        {/* VARIEDADES */}
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
                            <span className="text-muted-foreground ml-2">{v.cestos} cestos</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${topVariedades[0].cestos ? (v.cestos / topVariedades[0].cestos) * 100 : 0}%`,
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
                            <span className="text-muted-foreground ml-2">{v.cestos} cestos</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-destructive/50 rounded-full" style={{
                              width: `${variedadeData[0]?.cestos ? (v.cestos / variedadeData[0].cestos) * 100 : 0}%`
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
              <CardTitle className="text-base">Todas as Variedades — Cestos</CardTitle>
            </CardHeader>
            <CardContent>
              {variedadeData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(variedadeData.length * 32, 200)}>
                  <BarChart data={variedadeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} formatter={(v, name) => [v, name === "cestos" ? "Cestos" : "Pressas"]} />
                    <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTUFAS */}
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
                  <p className="text-xs text-muted-foreground mt-1">{e.pressas} pressas</p>
                  <p className="text-xs text-destructive mt-1">{e.descartes} descartes</p>
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

        {/* MENSAL */}
        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colheita por Mês — Cestos & Pressas</CardTitle>
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
                    <Line type="monotone" dataKey="pressas" name="Pressas" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESTINO */}
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