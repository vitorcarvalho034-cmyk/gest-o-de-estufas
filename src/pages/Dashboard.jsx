import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sprout, Scissors, Trash2, BarChart3, Warehouse, Flower2, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOTAL_VAOS } from "@/lib/estufasConfig";
import moment from "moment";

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
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [canteiros, colheitas, descartes, plantios] = await Promise.all([
        base44.entities.Canteiro.list(),
        base44.entities.Colheita.list(),
        base44.entities.Descarte.list(),
        base44.entities.Plantio.list("-data_plantio", 500),
      ]);

      const totalMudas = canteiros.reduce((sum, c) => sum + (c.total_mudas || 0), 0);
      const canteirosAtivos = canteiros.filter((c) => (c.total_mudas || 0) > 0).length;
      const totalCestos = colheitas.reduce((sum, c) => sum + (c.cestos || 0), 0);
      const totalPressas = colheitas.reduce((sum, c) => sum + (c.pressas || 0), 0);
      const totalDescartes = descartes.reduce((sum, d) => sum + (d.quantidade || 0), 0);

      // Alertas de corte de luz: plantios com >= 25 dias sem colheita registrada
      const hoje = moment();
      const alertasCorte = [];
      plantios.forEach((p) => {
        const diasDesdeP = hoje.diff(moment(p.data_plantio), "days");
        if (diasDesdeP >= 25) {
          alertasCorte.push({
            id: p.id,
            dias: diasDesdeP,
            estufa: p.estufa,
            lado: p.lado,
            vao: p.canteiro,
            variedade: p.variedade,
            data_plantio: p.data_plantio,
          });
        }
      });
      alertasCorte.sort((a, b) => b.dias - a.dias);

      setStats({ totalMudas, totalCestos, totalPressas, totalDescartes, canteirosAtivos });
      setAlertas(alertasCorte);
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

      {alertas.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-sm">Alerta de Corte de Luz</span>
            <span className="ml-auto text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-semibold">
              {alertas.length} plantio{alertas.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-amber-700">Os plantios abaixo atingiram 25+ dias e requerem corte de luz:</p>
          <div className="space-y-2">
            {alertas.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium">{a.variedade}</span>
                  <span className="text-xs text-muted-foreground">E{a.estufa} {a.lado}-{a.vao}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-amber-700">{a.dias} dias</span>
                  <p className="text-[10px] text-muted-foreground">plantado em {moment(a.data_plantio).format("DD/MM")}</p>
                </div>
              </div>
            ))}
            {alertas.length > 5 && (
              <p className="text-xs text-amber-600 text-center">+ {alertas.length - 5} mais plantios</p>
            )}
          </div>
        </div>
      )}

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
          subtitle="120 vãos"
          color="bg-chart-3/10 text-chart-3"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estrutura das Estufas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((estufa) => (
              <div key={estufa} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-primary" />
                    <span className="font-semibold">Estufa {estufa}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{TOTAL_VAOS[estufa]} vãos</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {["A", "B"].map((lado) => (
                    <div key={lado} className="bg-muted rounded-lg p-2 text-center">
                      <p className="font-medium">Lado {lado}</p>
                      <p className="text-muted-foreground">{TOTAL_VAOS[estufa] / 2} vãos</p>
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