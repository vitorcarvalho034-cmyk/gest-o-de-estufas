import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Scissors, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LocationSelect from "../components/LocationSelect";
import { toast } from "sonner";
import moment from "moment";

const DESTINOS = {
  "Barracão": 50,
  "Mercado": 60,
  "Oferta 60": 60,
  "Oferta 80": 80,
};

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

export default function Colheita() {
  const [colheitas, setColheitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    estufa: null,
    lado: "",
    canteiro: null,
    variedade: "",
    destino: "",
    cestos: "",
    data_colheita: new Date().toISOString().split("T")[0],
  });

  async function loadColheitas() {
    const data = await base44.entities.Colheita.list("-created_date", 50);
    setColheitas(data);
    setLoading(false);
  }

  useEffect(() => {
    loadColheitas();
  }, []);

  function updateForm(field, value) {
    setForm({ ...form, [field]: value });
  }

  const pressasPorCesto = form.destino ? DESTINOS[form.destino] : 0;
  const totalPressas = (parseInt(form.cestos) || 0) * pressasPorCesto;

  async function handleSubmit() {
    if (!form.estufa || !form.lado || !form.canteiro || !form.variedade || !form.destino || !form.cestos) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    await base44.entities.Colheita.create({
      ...form,
      cestos: parseInt(form.cestos),
      pressas: totalPressas,
      semana: getWeekNumber(form.data_colheita),
    });

    toast.success("Colheita registrada");
    setDialogOpen(false);
    setForm({
      estufa: null, lado: "", canteiro: null, variedade: "", destino: "", cestos: "",
      data_colheita: new Date().toISOString().split("T")[0],
    });
    loadColheitas();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Scissors className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Colheita</h1>
          </div>
          <p className="text-muted-foreground">Registre cestos colhidos por destino</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Colheita
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Colheitas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {colheitas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma colheita registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Sem.</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Variedade</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Cestos</TableHead>
                    <TableHead className="text-right">Pressas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colheitas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{moment(c.data_colheita).format("DD/MM/YYYY")}</TableCell>
                      <TableCell>{c.semana}</TableCell>
                      <TableCell>E{c.estufa} {c.lado}-{c.canteiro}</TableCell>
                      <TableCell>{c.variedade}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.destino}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{c.cestos}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.pressas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Colheita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <LocationSelect
              estufa={form.estufa}
              lado={form.lado}
              canteiro={form.canteiro}
              onChange={updateForm}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">Variedade *</Label>
              <Input
                placeholder="Ex: Anastasia Fuego"
                value={form.variedade}
                onChange={(e) => updateForm("variedade", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Destino *</Label>
                <Select value={form.destino} onValueChange={(v) => updateForm("destino", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DESTINOS).map(([name, pressas]) => (
                      <SelectItem key={name} value={name}>{name} ({pressas}p/cesto)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cestos *</Label>
                <Input
                  type="number"
                  placeholder="Qtd cestos"
                  value={form.cestos}
                  onChange={(e) => updateForm("cestos", e.target.value)}
                  min={1}
                />
              </div>
            </div>
            {form.destino && form.cestos && (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">Total calculado</p>
                <p className="text-2xl font-bold text-primary">{totalPressas} pressas</p>
                <p className="text-xs text-muted-foreground">{form.cestos} cestos × {pressasPorCesto} pressas</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Data da Colheita</Label>
              <Input
                type="date"
                value={form.data_colheita}
                onChange={(e) => updateForm("data_colheita", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}