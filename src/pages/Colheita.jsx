import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Scissors, Plus, TrendingUp, Package, Target, Calendar } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroEstufa, setFiltroEstufa] = useState("todas");
  const [canteirosDisponiveis, setCanteirosDisponiveis] = useState([]);
  const [variedadesDisponiveis, setVariedadesDisponiveis] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    estufa: "", lado: "", vao: "", canteiro: "",
    variedade: "", destino: "", cestos: "",
    data_colheita: new Date().toISOString().split("T")[0],
  });

  async function loadColheitas() {
    const data = await base44.entities.Colheita.list("-data_colheita", 100);
    setColheitas(data);
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

  async function handleSubmit() {
    if (!form.estufa || !form.lado || !form.vao || !form.canteiro || !form.variedade || !form.destino || !form.cestos) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    await base44.entities.Colheita.create({
      estufa: parseInt(form.estufa),
      lado: form.lado,
      vao: parseInt(form.vao),
      canteiro: parseInt(form.canteiro),
      variedade: form.variedade,
      destino: form.destino,
      cestos: parseInt(form.cestos),
      pressas: totalPressas,
      data_colheita: form.data_colheita,
      semana: getWeekNumber(form.data_colheita),
    });
    toast.success(`✂️ ${parseInt(form.cestos)} cestos registrados — ${totalPressas} pressas`);
    setSaving(false);
    setDialogOpen(false);
    setForm({ estufa: "", lado: "", vao: "", canteiro: "", variedade: "", destino: "", cestos: "", data_colheita: new Date().toISOString().split("T")[0] });
    setVariedadesDisponiveis([]);
    loadColheitas();
  }

  const filtradas = filtroEstufa === "todas" ? colheitas : colheitas.filter((c) => c.estufa === parseInt(filtroEstufa));
  const totalCestos = filtradas.reduce((s, c) => s + (c.cestos || 0), 0);
  const totalPressasTotal = filtradas.reduce((s, c) => s + (c.pressas || 0), 0);
  const hojeCount = filtradas.filter((c) => c.data_colheita === new Date().toISOString().split("T")[0]).length;
  const vaosArray = form.estufa ? getVaosArray(parseInt(form.estufa)) : [];

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
        <StatCard icon={TrendingUp} label="Pressas" value={totalPressasTotal.toLocaleString("pt-BR")} color="text-green-600" />
        <StatCard icon={Target} label="Registros" value={filtradas.length} />
        <StatCard icon={Calendar} label="Hoje" value={hojeCount} sub="colheitas" />
      </div>

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
                  <span className="text-xs text-muted-foreground">{cestosDia} cestos · {pressasDia} pressas</span>
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
                        <p className="text-xs text-muted-foreground">{c.pressas} pressas</p>
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