import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sprout, Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LocationSelect from "../components/LocationSelect";
import PlantioVaoDialog from "../components/PlantioVaoDialog";
import PlantioCSVDialog from "../components/PlantioCSVDialog";
import { toast } from "sonner";
import moment from "moment";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

export default function Plantio() {
  const [plantios, setPlantios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vaoDialogOpen, setVaoDialogOpen] = useState(false);
  const [form, setForm] = useState({
    estufa: null,
    lado: "",
    vao: null,
    canteiro: null,
    variedade: "",
    quantidade: "",
    data_plantio: new Date().toISOString().split("T")[0],
  });

  async function loadPlantios() {
    const data = await base44.entities.Plantio.list("-created_date", 50);
    setPlantios(data);
    setLoading(false);
  }

  useEffect(() => {
    loadPlantios();
  }, []);

  function updateForm(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit() {
    if (!form.estufa || !form.lado || !form.vao || !form.canteiro || !form.variedade || !form.quantidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    await base44.entities.Plantio.create({
      ...form,
      quantidade: parseInt(form.quantidade),
      semana: getWeekNumber(form.data_plantio),
    });

    // Update canteiro
    const canteiros = await base44.entities.Canteiro.filter({
      estufa: form.estufa,
      lado: form.lado,
      vao: form.vao,
      numero: form.canteiro,
    });

    if (canteiros.length > 0) {
      const cant = canteiros[0];
      const variedades = cant.variedades || [];
      const existing = variedades.find((v) => v.nome === form.variedade);
      let updated;
      if (existing) {
        updated = variedades.map((v) =>
          v.nome === form.variedade ? { ...v, quantidade: v.quantidade + parseInt(form.quantidade) } : v
        );
      } else {
        if (variedades.length >= 4) {
          toast.error("Canteiro já possui 4 variedades");
          return;
        }
        updated = [...variedades, { nome: form.variedade, quantidade: parseInt(form.quantidade) }];
      }
      const totalMudas = updated.reduce((s, v) => s + v.quantidade, 0);
      if (totalMudas > 2000) {
        toast.error("Total ultrapassaria 2000 mudas neste canteiro");
        return;
      }
      await base44.entities.Canteiro.update(cant.id, { variedades: updated, total_mudas: totalMudas });
    }

    toast.success("Plantio registrado");
    setDialogOpen(false);
    setForm({ estufa: null, lado: "", vao: null, canteiro: null, variedade: "", quantidade: "", data_plantio: new Date().toISOString().split("T")[0] });
    loadPlantios();
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
            <Sprout className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Plantio</h1>
          </div>
          <p className="text-muted-foreground">Registre novos plantios nos canteiros</p>
        </div>
        <div className="flex gap-2">

          <Button variant="outline" onClick={() => setVaoDialogOpen(true)} className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Plantio por Vão
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Unitário
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plantios Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {plantios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum plantio registrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Semana</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Variedade</TableHead>
                    <TableHead className="text-right">Mudas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plantios.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{moment(p.data_plantio).format("DD/MM/YYYY")}</TableCell>
                      <TableCell>Sem. {p.semana}</TableCell>
                      <TableCell>E{p.estufa} {p.lado} V{p.vao}-C{p.canteiro}</TableCell>
                      <TableCell>{p.variedade}</TableCell>
                      <TableCell className="text-right font-medium">{p.quantidade}</TableCell>
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
            <DialogTitle>Novo Plantio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <LocationSelect
              estufa={form.estufa}
              lado={form.lado}
              vao={form.vao}
              canteiro={form.canteiro}
              onChange={updateForm}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Variedade *</Label>
                <Input
                  placeholder="Ex: Anastasia Fuego"
                  value={form.variedade}
                  onChange={(e) => updateForm("variedade", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade *</Label>
                <Input
                  type="number"
                  placeholder="Mudas"
                  value={form.quantidade}
                  onChange={(e) => updateForm("quantidade", e.target.value)}
                  min={1}
                  max={2000}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Plantio</Label>
              <Input
                type="date"
                value={form.data_plantio}
                onChange={(e) => updateForm("data_plantio", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlantioVaoDialog
        open={vaoDialogOpen}
        onClose={() => setVaoDialogOpen(false)}
        onSaved={loadPlantios}
      />
    </div>
  );
}