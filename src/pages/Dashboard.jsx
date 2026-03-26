import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sprout, Scissors, Trash2, BarChart3, Warehouse, Flower2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    totalPressas: 0,
    totalDescartes: 0,
    canteirosAtivos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [canteiros, colheitas, descartes] = await Promise.all([
        base44.entities.Canteiro.list(),
        base44.entities.Colheita.list(),
        base44.entities.Descarte.list(),
      ]);

      const totalMudas = canteiros.reduce((sum, c) => sum + (c.total_mudas || 0), 0);
      const canteirosAtivos = canteiros.filter((c) => (c.total_mudas || 0) > 0).length;
      const totalCestos = colheitas.reduce((sum, c) => sum + (c.cestos || 0), 0);
      const totalPressas = colheitas.reduce((sum, c) => sum + (c.pressas || 0), 0);
      const totalDescartes = descartes.reduce((sum, d) => sum + (d.quantidade || 0), 0);

      setStats({ totalMudas, totalCestos, totalPressas, totalDescartes, canteirosAtivos });
      setLoading(false);
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
          subtitle={`${stats.canteirosAtivos} canteiros ativos`}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Scissors}
          label="Cestos Colhidos"
          value={stats.totalCestos.toLocaleString("pt-BR")}
          subtitle={`${stats.totalPressas.toLocaleString("pt-BR")} pressas`}
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
          subtitle="32 canteiros"
          color="bg-chart-3/10 text-chart-3"
        />
      </div>

      {/* Quick info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estrutura das Estufas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((estufa) => (
              <div key={estufa} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Estufa {estufa}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {["A", "B"].map((lado) => (
                    <div key={lado} className="bg-muted rounded-lg p-2 text-center">
                      <p className="font-medium">Lado {lado}</p>
                      <p className="text-muted-foreground">4 canteiros</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}