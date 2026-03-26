import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarClock, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";

function getCurrentWeek() {
  return moment().isoWeek();
}
function getCurrentYear() {
  return moment().year();
}

function getWeekDates(week, year) {
  const start = moment().year(year).isoWeek(week).startOf("isoWeek");
  const end = start.clone().add(5, "days"); // segunda a sábado
  return { start: start.format("DD/MM"), end: end.format("DD/MM") };
}

export default function PrevisaoColheita() {
  const [previsoes, setPrevisoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [semana, setSemana] = useState(getCurrentWeek());
  const [ano, setAno] = useState(getCurrentYear());
  const [form, setForm] = useState({
    variedade: "",
    pressas_previstas: "",
    estufa: null,
    lado: "",
    canteiro: null,
  });

  async function loadPrevisoes() {
    const data = await base44.entities.PrevisaoColheita.filter({ semana, ano });
    setPrevisoes(data);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadPrevisoes();
  }, [semana, ano]);

  function updateForm(field, value) {
    setForm({ ...form, [field]: value });
  }

  function navigateWeek(dir) {
    let newWeek = semana + dir;
    let newYear = ano;
    if (newWeek < 1) { newWeek = 52; newYear--; }
    if (newWeek > 52) { newWeek = 1; newYear++; }
    setSemana(newWeek);
    setAno(newYear);
  }

  async function handleSubmit() {
    if (!form.variedade || !form.pressas_previstas) {
      toast.error("Preencha variedade e pressas previstas");
      return;
    }

    await base44.entities.PrevisaoColheita.create({
      semana,
      ano,
      variedade: form.variedade,
      pressas_previstas: parseInt(form.pressas_previstas),
      estufa: form.estufa || undefined,
      lado: form.lado || undefined,
      canteiro: form.canteiro || undefined,
    });

    toast.success("Previsão adicionada");
    setDialogOpen(false);
    setForm({ variedade: "", pressas_previstas: "", estufa: null, lado: "", canteiro: null });
    loadPrevisoes();
  }

  async function handleDelete(id) {
    await base44.entities.PrevisaoColheita.delete(id);
    toast.success("Previsão removida");
    loadPrevisoes();
  }

  const totalPressas = previsoes.reduce((sum, p) => sum + (p.pressas_previstas || 0), 0);
  const weekDates = getWeekDates(semana, ano);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Previsão de Colheita</h1>
          </div>
          <p className="text-muted-foreground">Planejamento semanal de colheita por variedade</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Previsão
        </Button>
      </div>

      {/* Week navigator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold">Semana {semana}</p>
              <p className="text-sm text-muted-foreground">{weekDates.start} — {weekDates.end} / {ano}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <div className="bg-primary/5 rounded-xl p-4 flex items-center justify-between border border-primary/10">
        <span className="text-sm font-medium text-muted-foreground">Total Previsto</span>
        <span className="text-2xl font-bold text-primary">{totalPressas.toLocaleString("pt-BR")} pressas</span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Previsões da Semana {semana}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : previsoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma previsão para esta semana
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variedade</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Pressas Previstas</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previsoes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.variedade}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.estufa ? `E${p.estufa}` : "—"}
                        {p.lado ? ` ${p.lado}` : ""}
                        {p.canteiro ? `-${p.canteiro}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{p.pressas_previstas?.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Previsão — Semana {semana}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Variedade *</Label>
              <Input
                placeholder="Ex: Anastasia Fuego"
                value={form.variedade}
                onChange={(e) => updateForm("variedade", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pressas Previstas *</Label>
              <Input
                type="number"
                placeholder="Quantidade de pressas"
                value={form.pressas_previstas}
                onChange={(e) => updateForm("pressas_previstas", e.target.value)}
                min={1}
              />
            </div>

            <p className="text-xs text-muted-foreground font-medium">Localização (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estufa</Label>
                <Select value={String(form.estufa || "")} onValueChange={(v) => updateForm("estufa", v ? parseInt(v) : null)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>Estufa {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lado</Label>
                <Select value={form.lado || ""} onValueChange={(v) => updateForm("lado", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Lado A</SelectItem>
                    <SelectItem value="B">Lado B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Canteiro</Label>
                <Select value={String(form.canteiro || "")} onValueChange={(v) => updateForm("canteiro", v ? parseInt(v) : null)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>Canteiro {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}