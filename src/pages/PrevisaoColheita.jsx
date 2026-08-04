import { useState, useEffect } from "react";
import { previsaoColheitaAPI, plantiosAPI, pautaSemanaAPI } from "@/api/supabaseClient";
import { VARIEDADES } from "@/lib/variedades";
import { agruparPorCor, PALETA_CORES, getCorVariedade } from "@/lib/coresVariedades";
import { CalendarClock, Plus, ChevronLeft, ChevronRight, Trash2, Zap, Clock, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import { enqueue } from "@/lib/offlineQueue";

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
  const [mercadoConfirmado, setMercadoConfirmado] = useState(false);
  const [variedadesPlantadas] = useState(VARIEDADES);
  const [buscaVariedade, setBuscaVariedade] = useState("");
  const [filtroCor, setFiltroCor] = useState("todas");
  const [canteirosProximos, setCanteirosProximos] = useState([]);
  const [semana, setSemana] = useState(getCurrentWeek());
  const [ano, setAno] = useState(getCurrentYear());
  const [form, setForm] = useState({
    variedade: "",
    pressas_previstas: "",
    estufa: null,
    vao: null,
  });

  function mercadoKey(s, a) { return `mercado_cestos_${a}_${s}`; }

  async function loadPrevisoes() {
    try {
      const data = await previsaoColheitaAPI.list();
      const filtered = data.filter(p => p.semana === semana && p.ano === ano);
      setPrevisoes(filtered);
    } catch (e) {
      console.warn('loadPrevisoes error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Variedades carregadas da lista centralizada (não do banco)

  async function loadCanteirosProximos() {
    try {
    const plantios = await plantiosAPI.list(500);
    const hoje = moment();
    const semanaAtual = hoje.isoWeek();
    const anoAtual = hoje.year();
    // Agrupar por canteiro (estufa+lado+vao+canteiro)
    const canteiroMap = {};
    plantios.forEach((p) => {
      const dataColheita = moment(p.data_plantio).add(12, "weeks");
      const semColheita = dataColheita.isoWeek();
      const anoColheita = dataColheita.year();
      const diasAte = dataColheita.diff(hoje, "days");
      if (diasAte < -7 || diasAte > 90) return; // só mostra -7 a +90 dias
      const key = `E${p.estufa}-${p.lado}-V${p.vao || p.canteiro}-C${p.canteiro}`;
      if (!canteiroMap[key] || canteiroMap[key].diasAte > diasAte) {
        canteiroMap[key] = {
          key,
          estufa: p.estufa,
          lado: p.lado,
          vao: p.vao || p.canteiro,
          canteiro: p.canteiro,
          variedade: p.variedade,
          data_plantio: p.data_plantio,
          dataColheita: dataColheita.format("DD/MM/YYYY"),
          semColheita,
          anoColheita,
          diasAte,
          atrasado: diasAte < 0,
        };
      }
    });
    const lista = Object.values(canteiroMap).sort((a, b) => a.diasAte - b.diasAte);
    setCanteirosProximos(lista);
    } catch (e) {
      console.warn('loadCanteirosProximos error:', e);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadPrevisoes();
    // Carregar valor do mercado do Supabase (compartilhado entre todos os usuários)
    pautaSemanaAPI.getBySemana(semana, ano).then(pauta => {
      if (pauta && pauta.cestos_mercado != null) {
        setCestosMercadoInput(pauta.cestos_mercado.toString());
        setMercadoConfirmado(true);
      } else {
        // Fallback: tentar localStorage (compatibilidade com dados antigos)
        const saved = localStorage.getItem(mercadoKey(semana, ano));
        if (saved !== null) {
          setCestosMercadoInput(saved);
          setMercadoConfirmado(true);
        } else {
          setCestosMercadoInput("");
          setMercadoConfirmado(false);
        }
      }
    }).catch(() => {
      const saved = localStorage.getItem(mercadoKey(semana, ano));
      if (saved !== null) { setCestosMercadoInput(saved); setMercadoConfirmado(true); }
      else { setCestosMercadoInput(""); setMercadoConfirmado(false); }
    });
  }, [semana, ano]);

  useEffect(() => { loadCanteirosProximos(); }, []);

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
    const data = {
      semana, ano,
      variedade: form.variedade,
      pressas_previstas: parseInt(form.pressas_previstas),
      estufa: form.estufa || undefined,
      vao: form.vao || undefined,
    };
    if (!navigator.onLine) {
      enqueue('PrevisaoColheita', data);
      window.dispatchEvent(new Event('offline-queue-updated'));
      toast.success("📴 Previsão salva offline — será sincronizada quando houver conexão");
    } else {
      await previsaoColheitaAPI.create(data);
      toast.success("✅ Previsão adicionada — continue lançando!");
    }
    // Não fecha o dialog — limpa o formulário para o próximo lançamento
    setForm({ variedade: "", pressas_previstas: "", estufa: null, vao: null });
    loadPrevisoes();
  }

  function handleConcluir() {
    setDialogOpen(false);
    setForm({ variedade: "", pressas_previstas: "", estufa: null, vao: null });
  }

  async function handleDelete(id) {
    await previsaoColheitaAPI.delete(id);
    toast.success("Previsão removida");
    loadPrevisoes();
  }

  async function autoPopulate() {
    // Fetch plantios and calculate harvest week (plantio + 65 days)
    const plantios = await plantiosAPI.list(200);
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
      await previsaoColheitaAPI.create({
        semana, ano, variedade: item.variedade, pressas_previstas: item.pressas
      });
    }
    toast.success(`${items.length} previsão(ões) gerada(s) automaticamente`);
    loadPrevisoes();
  }

  const totalPressas = previsoes.reduce((sum, p) => sum + (p.pressas_previstas || 0), 0);
  const weekDates = getWeekDates(semana, ano);

  // Anastasia: 60h/cesto = Fuego, Magnum, Fiebre | 80h/cesto = todas as outras
  const ANAST_60 = ['fuego', 'magnum', 'fiebre'];
  const isAnastasia = (nome) => (nome || '').toLowerCase().includes('anastasia');
  const isAnast60 = (nome) => {
    const lower = (nome || '').toLowerCase();
    return isAnastasia(nome) && ANAST_60.some(v => lower.includes(v));
  };
  const isAnast80 = (nome) => isAnastasia(nome) && !isAnast60(nome);

  const hastesAnast = previsoes.filter(p => isAnastasia(p.variedade)).reduce((s, p) => s + (p.pressas_previstas || 0), 0);
  const hastesAnast80 = previsoes.filter(p => isAnast80(p.variedade)).reduce((s, p) => s + (p.pressas_previstas || 0), 0);
  const hastesAnast60 = previsoes.filter(p => isAnast60(p.variedade)).reduce((s, p) => s + (p.pressas_previstas || 0), 0);
  const cestosAnast80 = hastesAnast80 > 0 ? Math.floor(hastesAnast80 / 80) : 0;
  const cestosAnast60 = hastesAnast60 > 0 ? Math.floor(hastesAnast60 / 60) : 0;

  // Mercado: usuário define quantos cestos. Hastes usadas = cestos * 60
  const cestosMercadoNum = parseFloat(cestosMercadoInput) || 0;
  const hastesMercado = Math.round(cestosMercadoNum * 60);

  // Divisão 50/50: metade do total vai para Oferta, metade para Barracão
  // Anastasia entra obrigatoriamente no bloco de Oferta
  // Se Anastasia > 50%, o excedente também fica em Oferta (Barracão = 0)
  const metade = Math.round(totalPressas * 0.5);
  const hastesOfertas = Math.max(hastesAnast, metade); // Anastasia + complemento até 50%
  const hastesBarracao = Math.max(0, totalPressas - hastesOfertas - hastesMercado);
  const hastesOfertaComplemento = hastesOfertas - hastesAnast; // outras flores que completam os 50% de Oferta
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

      {/* Filtro de Cor */}
      {previsoes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filtrar por cor:</span>
          <button
            onClick={() => setFiltroCor("todas")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filtroCor === "todas"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            Todas
          </button>
          {Object.keys(PALETA_CORES).filter(c => c !== "Indefinida").map((cor) => {
            const paleta = PALETA_CORES[cor];
            const ativo = filtroCor === cor;
            return (
              <button
                key={cor}
                onClick={() => setFiltroCor(ativo ? "todas" : cor)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={ativo
                  ? { backgroundColor: paleta.bg, color: "#fff", borderColor: paleta.bg }
                  : { backgroundColor: paleta.light, color: paleta.bg, borderColor: paleta.bg }
                }
              >
                {cor}
              </button>
            );
          })}
        </div>
      )}

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
              {/* Mercado — input com confirmação */}
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
                      onChange={(e) => { setCestosMercadoInput(e.target.value); setMercadoConfirmado(false); }}
                      disabled={mercadoConfirmado}
                      className="w-24 text-right font-bold text-primary"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">cestos</span>
                    {!mercadoConfirmado ? (
                      <button
                        onClick={async () => {
                          // Salvar no Supabase para todos verem
                          try {
                            await pautaSemanaAPI.upsert(semana, ano, { cestos_mercado: parseFloat(cestosMercadoInput) || 0 });
                          } catch (e) {
                            console.warn('Erro ao salvar mercado:', e);
                          }
                          // Manter localStorage como fallback
                          localStorage.setItem(mercadoKey(semana, ano), cestosMercadoInput);
                          setMercadoConfirmado(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        onClick={() => setMercadoConfirmado(false)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ofertas */}
              <div className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">🌸 Ofertas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{hastesOfertas.toLocaleString("pt-BR")} hastes (50% do total — Anastasia + complemento) ÷ 60</p>
                    {hastesOfertaComplemento > 0 && (
                      <p className="text-xs text-muted-foreground">→ Anastasia: {hastesAnast.toLocaleString('pt-BR')} + outras flores: {hastesOfertaComplemento.toLocaleString('pt-BR')}</p>
                    )}
                    {hastesAnast > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {cestosAnast80 > 0 && (
                          <p className="text-xs text-muted-foreground">→ Anast. 80h/cesto: {hastesAnast80.toLocaleString('pt-BR')} hastes = <span className="font-semibold text-foreground">{cestosAnast80} cestos</span></p>
                        )}
                        {cestosAnast60 > 0 && (
                          <p className="text-xs text-muted-foreground">→ Anast. 60h/cesto: {hastesAnast60.toLocaleString('pt-BR')} hastes = <span className="font-semibold text-foreground">{cestosAnast60} cestos</span></p>
                        )}
                      </div>
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
                    <p className="text-xs text-muted-foreground mt-0.5">{hastesBarracao.toLocaleString("pt-BR")} hastes (50% do total, exceto Anastasia e Mercado) ÷ 50</p>
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

      {/* Gráfico de Cores — Previsão */}
      {previsoes.length > 0 && (() => {
        const agrupado = {};
        previsoes.forEach((p) => {
          const key = (p.variedade || "").trim().toLowerCase();
          if (!agrupado[key]) agrupado[key] = { variedade: (p.variedade || "").trim(), total: 0 };
          agrupado[key].total += p.pressas_previstas || 0;
        });
        const itensCores = agruparPorCor(Object.values(agrupado).map(l => ({ variedade: l.variedade, quantidade: l.total })));
        const totalCores = itensCores.reduce((s, c) => s + c.total, 0);
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>🎨</span> Previsão por Cor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {itensCores.map(({ cor, total }) => {
                  const paleta = PALETA_CORES[cor] || PALETA_CORES["Indefinida"];
                  const pct = totalCores > 0 ? Math.round((total / totalCores) * 100) : 0;
                  return (
                    <div key={cor} className="flex items-center gap-3">
                      <div className="w-24 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: paleta.light, color: paleta.bg, border: `1.5px solid ${paleta.bg}` }}>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: paleta.bg }} />
                          {cor}
                        </span>
                      </div>
                      <div className="flex-1 h-5 rounded-full overflow-hidden bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: paleta.bg }} />
                      </div>
                      <div className="w-32 text-right text-xs font-semibold text-muted-foreground">
                        {total.toLocaleString("pt-BR")} hastes <span className="text-muted-foreground/60">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
          ) : (() => {
            // Agrupar variedades com mesmo nome somando as hastes
            const agrupado = {};
            previsoes.forEach((p) => {
              const key = (p.variedade || "").trim().toLowerCase();
              if (!agrupado[key]) {
                agrupado[key] = { variedade: (p.variedade || "").trim(), total: 0, ids: [] };
              }
              agrupado[key].total += p.pressas_previstas || 0;
              agrupado[key].ids.push(p.id);
            });
            const linhas = Object.values(agrupado)
              .filter((l) => filtroCor === "todas" || getCorVariedade(l.variedade) === filtroCor)
              .sort((a, b) => b.total - a.total);
            return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variedade</TableHead>
                      <TableHead className="text-right">Hastes Previstas</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((linha) => {
                      const cor = getCorVariedade(linha.variedade);
                      const paleta = PALETA_CORES[cor] || PALETA_CORES["Indefinida"];
                      return (
                        <TableRow key={linha.variedade}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: paleta.bg }} />
                              {linha.variedade}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{linha.total.toLocaleString("pt-BR")}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remover todas as entradas desta variedade"
                              onClick={async () => {
                                for (const id of linha.ids) await handleDelete(id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })()
          }
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
            const itensMostrarAll = estufa === 1 ? [...semEstufa, ...itens] : itens;
            const itensMostrar = itensMostrarAll.filter((p) => filtroCor === "todas" || getCorVariedade(p.variedade) === filtroCor);
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

      {/* Canteiros Próximos da Colheita — agrupados por semana */}
      {canteirosProximos.length > 0 && (() => {
        // Agrupar por semana/ano
        const porSemana = {};
        canteirosProximos.forEach((c) => {
          const key = `${c.anoColheita}-${String(c.semColheita).padStart(2,'0')}`;
          if (!porSemana[key]) porSemana[key] = { semana: c.semColheita, ano: c.anoColheita, itens: [] };
          porSemana[key].itens.push(c);
        });
        const semanas = Object.values(porSemana).sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano;
          return a.semana - b.semana;
        });
        return semanas.map((grupo) => (
          <Card key={`${grupo.ano}-${grupo.semana}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="w-4 h-4 text-primary" />
                Semana {grupo.semana} / {grupo.ano}
                <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                  {grupo.itens.length} canteiro{grupo.itens.length > 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grupo.itens.map((c) => {
                  const cor = c.atrasado ? "border-red-300 bg-red-50" :
                    c.diasAte <= 7 ? "border-red-200 bg-red-50" :
                    c.diasAte <= 14 ? "border-amber-200 bg-amber-50" :
                    c.diasAte <= 30 ? "border-primary/20 bg-primary/5" :
                    "border-border bg-muted/20";
                  const textCor = c.atrasado ? "text-red-700" :
                    c.diasAte <= 7 ? "text-red-600" :
                    c.diasAte <= 14 ? "text-amber-600" : "text-primary";
                  return (
                    <div key={c.key} className={`rounded-xl border p-3 space-y-2 ${cor}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">E{c.estufa} {c.lado} · V{c.vao}</span>
                        <span className={`text-xs font-bold ${textCor}`}>
                          {c.atrasado ? `${Math.abs(c.diasAte)}d atrasado` : c.diasAte === 0 ? "Hoje!" : `${c.diasAte}d`}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate">{c.variedade}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{c.dataColheita}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Plantado em {moment(c.data_plantio).format("DD/MM/YYYY")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ));
      })()}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
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
                <div className="space-y-1.5">
                  <Input
                    placeholder="Buscar variedade..."
                    value={buscaVariedade}
                    onChange={(e) => setBuscaVariedade(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {variedadesPlantadas
                      .filter((v) => v.toLowerCase().includes(buscaVariedade.toLowerCase()))
                      .map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => { updateForm("variedade", v); setBuscaVariedade(""); }}
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
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleConcluir}>Concluir</Button>
            <Button onClick={handleSubmit}>+ Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}