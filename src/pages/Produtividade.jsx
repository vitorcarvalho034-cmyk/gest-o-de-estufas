import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(152, 45%, 32%)", "hsl(42, 80%, 55%)", "hsl(200, 60%, 45%)", "hsl(340, 65%, 55%)", "hsl(270, 50%, 55%)"];

export default function Produtividade() {
  const [colheitas, setColheitas] = useState([]);
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstufa, setFilterEstufa] = useState("all");

  useEffect(() => {
    async function load() {
      const [col, desc] = await Promise.all([
        base44.entities.Colheita.list("-created_date", 200),
        base44.entities.Descarte.list("-created_date", 200),
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

  // By destino
  const byDestino = {};
  filtered.forEach((c) => {
    if (!byDestino[c.destino]) byDestino[c.destino] = 0;
    byDestino[c.destino] += c.cestos || 0;
  });
  const destinoData = Object.entries(byDestino).map(([name, value]) => ({ name, value }));

  // By canteiro
  const byCanteiro = {};
  filtered.forEach((c) => {
    const key = `E${c.estufa} ${c.lado}-${c.canteiro}`;
    if (!byCanteiro[key]) byCanteiro[key] = { cestos: 0, pressas: 0 };
    byCanteiro[key].cestos += c.cestos || 0;
    byCanteiro[key].pressas += c.pressas || 0;
  });
  const canteiroData = Object.entries(byCanteiro)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.cestos - a.cestos)
    .slice(0, 10);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By variedade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cestos por Variedade</CardTitle>
          </CardHeader>
          <CardContent>
            {variedadeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={variedadeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v, name) => [v, name === "cestos" ? "Cestos" : "Pressas"]}
                  />
                  <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By destino */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cestos por Destino</CardTitle>
          </CardHeader>
          <CardContent>
            {destinoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={destinoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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

        {/* By canteiro */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Canteiros por Cestos</CardTitle>
          </CardHeader>
          <CardContent>
            {canteiroData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={canteiroData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v, name) => [v, name === "cestos" ? "Cestos" : "Pressas"]}
                  />
                  <Bar dataKey="cestos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pressas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}