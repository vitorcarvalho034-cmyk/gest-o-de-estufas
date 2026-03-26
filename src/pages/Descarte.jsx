import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LocationSelect from "../components/LocationSelect";
import { toast } from "sonner";
import moment from "moment";

const MOTIVOS = ["Doença", "Praga", "Qualidade", "Excesso", "Outro"];

export default function Descarte() {
  const [descartes, setDescartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    estufa: null,
    lado: "",
    canteiro: null,
    variedade: "",
    quantidade: "",
    motivo: "",
    observacao: "",
    data_descarte: new Date().toISOString().split("T")[0],
  });

  async function loadDescartes() {
    const data = await base44.entities.Descarte.list("-created_date", 50);
    setDescartes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadDescartes();
  }, []);

  function updateForm(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit() {
    if (!form.estufa || !form.lado || !form.canteiro || !form.variedade || !form.quantidade || !form.motivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    await base44.entities.Descarte.create({
      ...form,
      quantidade: parseInt(form.quantidade),
    });

    toast.success("Descarte registrado");
    setDialogOpen(false);
    setForm({
      estufa: null, lado: "", canteiro: null, variedade: "", quantidade: "",
      motivo: "", observacao: "", data_descarte: new Date().toISOString().split("T")[0],
    });
    loadDescartes();
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
            <Trash2 className="w-8 h-8 text-destructive" />
            <h1 className="text-3xl font-bold tracking-tight">Descarte</h1>
          </div>
          <p className="text-muted-foreground">Registre mudas descartadas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Descarte
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Descartes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {descartes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum descarte registrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Variedade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Mudas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descartes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{moment(d.data_descarte).format("DD/MM/YYYY")}</TableCell>
                      <TableCell>E{d.estufa} {d.lado}-{d.canteiro}</TableCell>
                      <TableCell>{d.variedade}</TableCell>
                      <TableCell><Badge variant="outline">{d.motivo}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{d.quantidade}</TableCell>
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
            <DialogTitle>Novo Descarte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <LocationSelect
              estufa={form.estufa}
              lado={form.lado}
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
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo *</Label>
              <Select value={form.motivo} onValueChange={(v) => updateForm("motivo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={form.observacao}
                onChange={(e) => updateForm("observacao", e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do Descarte</Label>
              <Input
                type="date"
                value={form.data_descarte}
                onChange={(e) => updateForm("data_descarte", e.target.value)}
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