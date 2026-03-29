import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarClock, Plus, ChevronLeft, ChevronRight, Trash2, Zap } from "lucide-react";
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
  const [viewMode, setViewMode] = useState("total"); // "total" | "por_estufa"
  const [cestosMercadoInput, setCestosMercadoInput] = useState("");
  const [variedadesPlantadas, setVariedadesPlantadas] = useState([]);
  const [semana, setSemana] = useState(getCurrentWeek());
  const [ano, setAno] = useState(getCurrentYear());
  const [form, setForm] = useState({
    variedade: "",
    pressas_previstas: "",
    estufa: null,
    vao: null,
  });

  async function loadPrevisoes() {
    const data = await base44.entities.PrevisaoColheita.filter({ semana, ano });
    setPrevisoes(data);
    setLoading(false);
  }

  async function loadVariedades() {
    const canteiros = await base44.entities.Canteiro.list();
    const EXCLUIR = ['magnun', 'magnus', 'sobras', 'sobra', 'spartak', 'spartac', 'anast.fuego'];
    const RENAME_MAP = {
      'boda': 'Anast. Boda',
      'cipria': 'Anast. Cipria',
      'chispa': 'Anast. Chispa',
      'herreira': 'Anast. Herreira',
      'fiebre': 'Anast. Fiebre',
      'lotso': 'Anast. Lotso',
      'magnum': 'Anast. Magnum',
    };
    const seen = new Set();
    const nomes = [];
    canteiros.forEach((c) => {
      (c.variedades || []).forEach((v) => {
        if (!v.nome) return;
        const lower = v.nome.toLowerCase().trim();
        if (EXCLUIR.includes(lower)) return;
        const displayName = RENAME_MAP[lower] || v.nome;
        const key = displayName.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        nomes.push(displayName);
      });
    });
    setVariedadesPlantadas(nomes.sort());
  }

  useEffect(() => {
    setLoading(true);
    loadPrevisoes();
  }, [semana, ano]);

  useEffect(() => { loadVariedades(); }, []);

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
      vao: form.vao || undefined,
    });

    toast.success("Previsão adicionada");
    setDialogOpen(false);
    setForm({ variedade: "", pressas_previstas: "", estufa: null, vao: null });
    loadPrevisoes();
  }

  async function handleDelete(id) {
    await base44.entities.PrevisaoColheita.delete(id);
    toast.success("Previsão removida");
    loadPrevisoes();
  }

  async function autoPopulate() {
    // Fetch plantios and calculate harvest week (plantio + 65 days)
    const plantios = await base44.entities.Plantio.list("-data_plantio", 200);
    const grouped = {};
    plantios.forEach((p) => {
      const harvestDate = moment(p.data_plantio).add(65, "days");
      const harvestWeek = harvestDate.isoWeek();
      const harvestYear = harvestDate.year();
      if (harvestWeek !== semana || harvestYear !== ano) return;
      const key = p.variedade;
      if (!grouped[key]) grouped[key] = { variedade: key, pressas: 0 };
      // Estimate: ~0.5 pressas per muda
      grouped[key].pressas += Math.round((p.quantidade || 0) * 0.5);
    });
    const items = Object.values(grouped);
    if (items.length === 0) { toast.error("Nenhum plantio previsto para colheita nesta semana (65 dias após plantio)"); return; }
    for (const item of items) {
      await base44.entities.PrevisaoColheita.create({
        semana, ano, variedade: item.variedade, pressas_previstas: item.pressas
      });
    }
    toast.success(`${items.length} previsão(ões) gerada(s) automaticamente`);
    loadPrevisoes();
  }

  const totalPressas = previsoes.reduce((sum, p) => sum + (p.pressas_previstas || 0), 0);
  const weekDates = getWeekDates(semana, ano);

  // Hastes de Anast.
  const hastesAnast = previsoes.filter(p => p.variedade?.toLowerCase().startsWith("anast.")).reduce((s, p) => s + (p.pressas_previstas || 0), 0);

  // Mercado: usuário define quantos cestos. Hastes usadas = cestos * 60
  const cestosMercadoNum = parseFloat(cestosMercadoInput) || 0;
  const hastesMercado = Math.round(cestosMercadoNum * 60);

  // Sobra após mercado → redistribuída entre Ofertas (÷60) e Barracão (÷50)
  const hastesSobra = Math.max(0, totalPressas - hastesMercado);
  const hastesOfertas = Math.round(hastesSobra * 0.5);
  const hastesBarracao = hastesSobra - hastesOfertas;
  const cestosOfertas = hastesOfertas > 0 ? Math.floor(hastesOfertas / 60) : 0;
  const cestosBarracao = hastesBarracao > 0 ? Math.floor(hastesBarracao / 50) : 0;

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={autoPopulate} className="gap-2">
            <Zap className="w-4 h-4" /> Auto-preencher
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Previsão
          </Button>
        </div>
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

      {/* View toggle */}
      <div className="flex gap-2">
        {[{value: "total", label: "Total"}, {value: "por_estufa", label: "Por Estufa"}].map((v) => (
          <button
            key={v.value}
            onClick={() => setViewMode(v.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              viewMode === v.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Total + Distribuição */}
      <div className="space-y-3">
        <div className="bg-primary/5 rounded-xl p-4 flex items-center justify-between border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Total Previsto</span>
          <span className="text-2xl font-bold text-primary">{totalPressas.toLocaleString("pt-BR")} hastes</span>
        </div>

        {totalPressas > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distribuição</p>
            </div>
            <div className="divide-y divide-border">
              {/* Mercado — input livre */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">🏪 Mercado</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {hastesMercado > 0 ? `${hastesMercado.toLocaleString("pt-BR")} hastes usadas` : "Informe quantos cestos serão destinados ao mercado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={cestosMercadoInput}
                      onChange={(e) => setCestosMercadoInput(e.target.value)}
                      className="w-24 text-right font-bold text-primary"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">cestos</span>
                  </div>
                </div>
              </div>

              {/* Ofertas */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">🌸 Ofertas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{hastesOfertas.toLocaleString("pt-BR")} hastes (50% da sobra) ÷ 60</p>
                    {hastesAnast > 0 && (
                      <p className="text-xs text-muted-foreground">Inclui Anast.: {hastesAnast.toLocaleString("pt-BR")} hastes</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{cestosOfertas.toLocaleString("pt-BR")} cestos</p>
                  </div>
                </div>
              </div>

              {/* Barracão */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">🏠 Barracão</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{hastesBarracao.toLocaleString("pt-BR")} hastes (50% da sobra) ÷ 50</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{cestosBarracao.toLocaleString("pt-BR")} cestos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {viewMode === "total" ? (
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
                    <TableHead>Estufa</TableHead>
                    <TableHead>Vão</TableHead>
                    <TableHead className="text-right">Hastes Previstas</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previsoes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.variedade}</TableCell>
                      <TableCell className="text-muted-foreground">{p.estufa ? `Estufa ${p.estufa}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.vao ? `Vão ${p.vao}` : "—"}</TableCell>
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
      ) : (
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : previsoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma previsão para esta semana</p>
        ) : (
          [1, 2, 3, 4].map((estufa) => {
            const itens = previsoes.filter((p) => p.estufa === estufa);
            const semEstufa = estufa === 1 ? previsoes.filter((p) => !p.estufa) : [];
            const itensMostrar = estufa === 1 ? [...semEstufa, ...itens] : itens;
            const totalEstufa = itensMostrar.reduce((s, p) => s + (p.pressas_previstas || 0), 0);
            if (itensMostrar.length === 0) return null;
            return (
              <Card key={estufa}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Estufa {estufa}</CardTitle>
                    <span className="text-sm font-bold text-primary">{totalEstufa.toLocaleString("pt-BR")} hastes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variedade</TableHead>
                        <TableHead>Vão</TableHead>
                        <TableHead className="text-right">Hastes</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensMostrar.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.variedade}</TableCell>
                          <TableCell className="text-muted-foreground">{p.vao ? `Vão ${p.vao}` : "—"}</TableCell>
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      )}

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
              {variedadesPlantadas.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Plantadas atualmente:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {variedadesPlantadas.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateForm("variedade", v)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                          form.variedade === v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50 hover:text-primary"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hastes Previstas *</Label>
              <Input
                type="number"
                placeholder="Quantidade de hastes"
                value={form.pressas_previstas}
                onChange={(e) => updateForm("pressas_previstas", e.target.value)}
                min={1}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <Label className="text-xs">Vão</Label>
                <Select value={String(form.vao || "")} onValueChange={(v) => updateForm("vao", v ? parseInt(v) : null)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>Vão {n}</SelectItem>
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