import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { BarChart3, Download, RefreshCw, AlertTriangle, Scissors, Trash2, Ruler, CheckCircle2, CalendarDays, Leaf } from "lucide-react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, Legend } from "recharts";
import { toast } from "sonner";
import { colheitasAPI, descartesAPI } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREA_M2_POR_CANTEIRO, construirAnaliseColheita, formatarNumero, formatarPercentual, isCrisantemo, nomeCanonicamenteNormalizado } from "@/lib/dadosColheita";
import { exportarDadosColheitaExcel } from "@/lib/exportarDadosColheitaExcel";

const tooltipStyle = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 },
  labelStyle: { fontWeight: 700 },
};

function Indicador({ icon: Icon, titulo, valor, detalhe, cor = "text-primary", fundo = "bg-primary/10" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{valor}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${fundo}`}><Icon className={`h-5 w-5 ${cor}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaTabela({ children, className = "" }) {
  return <tr className={`border-b transition-colors hover:bg-muted/30 ${className}`}>{children}</tr>;
}

export default function DadosColheita() {
  const anoAtual = moment().year();
  const [ano, setAno] = useState(String(anoAtual));
  const [semana, setSemana] = useState("all");
  const [estufa, setEstufa] = useState("all");
  const [variedade, setVariedade] = useState("all");
  const [colheitas, setColheitas] = useState([]);
  const [descartes, setDescartes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [exportando, setExportando] = useState(false);

  const carregar = async (mostrarToast = false) => {
    setAtualizando(true);
    setErro("");
    try {
      const [dadosColheita, dadosDescarte] = await Promise.all([
        colheitasAPI.listByAno(Number(ano)),
        descartesAPI.listByAno(Number(ano)),
      ]);
      setColheitas(Array.isArray(dadosColheita) ? dadosColheita : []);
      setDescartes(Array.isArray(dadosDescarte) ? dadosDescarte : []);
      if (mostrarToast) toast.success("Dados de colheita atualizados");
    } catch (e) {
      console.error("Dados de colheita:", e);
      setErro("Não foi possível carregar os dados agora. Verifique a conexão e tente novamente.");
      if (mostrarToast) toast.error("Falha ao atualizar dados de colheita");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => { carregar(); }, [ano]);

  const variedades = useMemo(() => {
    const nomes = new Set();
    [...colheitas, ...descartes].forEach((registro) => {
      if (registro?.variedade && isCrisantemo(registro.variedade)) {
        nomes.add(nomeCanonicamenteNormalizado(registro.variedade));
      }
    });
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [colheitas, descartes]);

  const semanasDisponiveis = useMemo(() => {
    const valores = new Set();
    [...colheitas, ...descartes].forEach((registro) => {
      const data = registro.data_colheita || registro.data_descarte;
      if (data && moment(data, "YYYY-MM-DD", true).isValid()) valores.add(moment(data).isoWeek());
    });
    return [...valores].sort((a, b) => a - b);
  }, [colheitas, descartes]);

  const filtros = useMemo(() => ({ ano: Number(ano), semana, estufa, variedade }), [ano, semana, estufa, variedade]);
  const analise = useMemo(() => construirAnaliseColheita(colheitas, descartes, filtros), [colheitas, descartes, filtros]);

  const semanasDoAno = useMemo(() => {
    const inicio = moment(`${ano}-01-04`).startOf("isoWeek");
    const fim = moment(`${ano}-12-28`).endOf("isoWeek");
    const total = fim.isoWeek();
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [ano]);

  const exportar = async () => {
    if (!analise.resumo.registros_colheita && !analise.resumo.registros_descarte) {
      toast.warning("Não há dados de crisântemos para exportar com esses filtros.");
      return;
    }
    setExportando(true);
    try {
      await exportarDadosColheitaExcel(analise);
      toast.success("Planilha Excel gerada com sucesso");
    } catch (e) {
      console.error("Exportação Excel:", e);
      toast.error("Não foi possível gerar a planilha. Tente novamente.");
    } finally {
      setExportando(false);
    }
  };

  const resumo = analise.resumo;
  const topVariedades = analise.porVariedade.slice(0, 12).map((linha) => ({
    ...linha,
    nomeCurto: linha.variedade.length > 18 ? `${linha.variedade.slice(0, 18)}…` : linha.variedade,
  }));
  const porMesGrafico = analise.porMes.map((linha) => ({ ...linha, mes: linha.mes.charAt(0).toUpperCase() + linha.mes.slice(1) }));
  const porDiaGrafico = analise.porDiaSemana.map((linha) => ({ ...linha, curto: linha.nome.slice(0, 3) }));
  const dadosExcluidos = analise.validacoes.colheitas_nao_classificadas.length + analise.validacoes.descartes_nao_classificados.length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><BarChart3 className="h-7 w-7 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dados de Colheita</h1>
              <p className="text-sm text-muted-foreground">Análise profissional de crisântemos, produtividade e descarte em hastes</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => carregar(true)} disabled={atualizando} className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${atualizando ? "animate-spin" : ""}`} /> Atualizar dados
          </button>
          <button onClick={exportar} disabled={exportando || carregando} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
            <Download className="h-4 w-4" /> {exportando ? "Gerando Excel..." : "Exportar Excel"}
          </button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Ano</p>
            <Select value={ano} onValueChange={(valor) => { setAno(valor); setSemana("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[anoAtual, anoAtual - 1, anoAtual - 2].map((valor) => <SelectItem key={valor} value={String(valor)}>{valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Semana</p>
            <Select value={semana} onValueChange={setSemana}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as semanas</SelectItem>
                {semanasDoAno.map((valor) => <SelectItem key={valor} value={String(valor)} disabled={!semanasDisponiveis.includes(valor)}>Semana {valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Estufa</p>
            <Select value={estufa} onValueChange={setEstufa}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as estufas</SelectItem>
                {[1, 2, 3, 4].map((valor) => <SelectItem key={valor} value={String(valor)}>Estufa {valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Variedade</p>
            <Select value={variedade} onValueChange={setVariedade}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as variedades</SelectItem>
                {variedades.map((nome) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="flex items-center gap-3 p-4 text-sm text-destructive"><AlertTriangle className="h-5 w-5" />{erro}</CardContent></Card>
      )}

      {carregando ? (
        <div className="flex h-64 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador icon={Scissors} titulo="Hastes colhidas" valor={formatarNumero(resumo.hastes_colhidas)} detalhe={`${formatarNumero(resumo.cestos)} cestos · ${formatarNumero(resumo.registros_colheita)} lançamentos`} />
            <Indicador icon={Trash2} titulo="Hastes descartadas" valor={formatarNumero(resumo.hastes_descartadas)} detalhe={`${formatarPercentual(resumo.descarte_pct)} de perda sobre o processado`} cor="text-destructive" fundo="bg-destructive/10" />
            <Indicador icon={Ruler} titulo="Produtividade" valor={`${formatarNumero(resumo.produtividade_m2, 1)} h/m²`} detalhe={`${formatarNumero(resumo.area_m2, 2)} m² de área efetiva`} cor="text-amber-700" fundo="bg-amber-100" />
            <Indicador icon={CheckCircle2} titulo="Aproveitamento" valor={formatarPercentual(resumo.aproveitamento_pct)} detalhe="Colhidas ÷ (colhidas + descartadas)" cor="text-emerald-700" fundo="bg-emerald-100" />
          </div>

          {dadosExcluidos > 0 && (
            <Card className="border-amber-300 bg-amber-50"><CardContent className="flex flex-col gap-2 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><span><strong>{dadosExcluidos} registro(s)</strong> não entraram na análise por não estarem classificados como crisântemos.</span></div><span className="text-xs">Veja a aba “Validações” do Excel para revisar.</span></CardContent></Card>
          )}

          <Tabs defaultValue="variedades" className="space-y-5">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted p-1">
              <TabsTrigger value="variedades">Produtividade por variedade</TabsTrigger>
              <TabsTrigger value="mensal">Comparativo mensal</TabsTrigger>
              <TabsTrigger value="dias">Colheita por dia</TabsTrigger>
              <TabsTrigger value="criterios">Critérios e validações</TabsTrigger>
            </TabsList>

            <TabsContent value="variedades" className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-5">
                <Card className="xl:col-span-2"><CardHeader><CardTitle className="text-base">Top variedades — hastes/m²</CardTitle></CardHeader><CardContent className="h-80">
                  {topVariedades.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={[...topVariedades].sort((a, b) => a.produtividade_m2 - b.produtividade_m2)} layout="vertical" margin={{ left: 18, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="nomeCurto" type="category" width={115} tick={{ fontSize: 10 }} /><Tooltip {...tooltipStyle} formatter={(valor) => [`${formatarNumero(valor, 2)} hastes/m²`, "Produtividade"]} /><Bar dataKey="produtividade_m2" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados no período</p>}
                </CardContent></Card>
                <Card className="xl:col-span-3"><CardHeader><CardTitle className="text-base">Leitura do relatório</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>O ranking considera somente <strong className="text-foreground">crisântemos</strong> e unifica nomes equivalentes de variedade para não duplicar o resultado.</p><p>Área efetiva é calculada por canteiro único com colheita no período: <strong className="text-foreground">{AREA_M2_POR_CANTEIRO.toLocaleString("pt-BR")} m² por canteiro</strong>.</p><p>O descarte é lido em <strong className="text-foreground">hastes</strong>, separado da colheita, e entra na taxa de aproveitamento.</p><p className="rounded-lg bg-muted p-3 text-xs">Para auditoria, o Excel inclui as abas de bases brutas e de validações junto com todos os cálculos consolidados.</p></CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle className="text-base">Produtividade / variedade</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 text-left">Variedade</th><th className="px-2 py-3 text-right">Hastes colhidas</th><th className="px-2 py-3 text-right">Descartadas</th><th className="px-2 py-3 text-right">Cestos</th><th className="px-2 py-3 text-right">Canteiros</th><th className="px-2 py-3 text-right">Área (m²)</th><th className="px-2 py-3 text-right">Hastes/m²</th><th className="px-2 py-3 text-right">Aproveitamento</th></tr></thead><tbody>{analise.porVariedade.map((linha) => <LinhaTabela key={linha.variedade}><td className="px-2 py-3 font-medium">{linha.variedade}</td><td className="px-2 py-3 text-right font-semibold text-primary">{formatarNumero(linha.hastes_colhidas)}</td><td className="px-2 py-3 text-right text-destructive">{formatarNumero(linha.hastes_descartadas)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.cestos)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.canteiros)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.area_m2, 2)}</td><td className="px-2 py-3 text-right font-semibold">{formatarNumero(linha.produtividade_m2, 2)}</td><td className="px-2 py-3 text-right">{formatarPercentual(linha.aproveitamento_pct)}</td></LinhaTabela>)}{!analise.porVariedade.length && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum registro de crisântemo foi encontrado para este filtro.</td></tr>}</tbody></table></CardContent></Card>
            </TabsContent>

            <TabsContent value="mensal" className="space-y-5">
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Comparativo mensal {variedade !== "all" ? `— ${variedade}` : "— todas as variedades"}</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={porMesGrafico} margin={{ left: 6, right: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis tick={{ fontSize: 11 }} /><Tooltip {...tooltipStyle} formatter={(valor, nome) => [formatarNumero(valor, nome === "Aproveitamento" ? 1 : 0), nome]} /><Legend /><Line type="monotone" dataKey="hastes_colhidas" name="Hastes colhidas" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="hastes_descartadas" name="Hastes descartadas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Detalhamento mensal</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 text-left">Mês</th><th className="px-2 py-3 text-right">Hastes</th><th className="px-2 py-3 text-right">Descartadas</th><th className="px-2 py-3 text-right">Cestos</th><th className="px-2 py-3 text-right">Hastes/m²</th><th className="px-2 py-3 text-right">Aproveitamento</th><th className="px-2 py-3 text-right">% do ano</th></tr></thead><tbody>{analise.porMes.map((linha) => <LinhaTabela key={linha.mes_numero}><td className="px-2 py-3 font-medium capitalize">{linha.mes}</td><td className="px-2 py-3 text-right text-primary font-semibold">{formatarNumero(linha.hastes_colhidas)}</td><td className="px-2 py-3 text-right text-destructive">{formatarNumero(linha.hastes_descartadas)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.cestos)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.produtividade_m2, 2)}</td><td className="px-2 py-3 text-right">{formatarPercentual(linha.aproveitamento_pct)}</td><td className="px-2 py-3 text-right">{formatarPercentual(linha.participacao_anual_pct)}</td></LinhaTabela>)}</tbody></table></CardContent></Card>
            </TabsContent>

            <TabsContent value="dias" className="space-y-5">
              {semana === "all" ? (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <CalendarDays className="mt-0.5 h-6 w-6 text-amber-700" />
                      <div>
                        <h3 className="font-semibold text-amber-950">Escolha uma semana para analisar os dias</h3>
                        <p className="mt-1 max-w-2xl text-sm text-amber-900">Esta análise é semanal. Para evitar somar segundas-feiras, terças-feiras e outros dias de semanas diferentes, os totais só aparecem depois de selecionar uma semana no filtro acima.</p>
                      </div>
                    </div>
                    <button onClick={() => setSemana(String(moment().isoWeek()))} className="shrink-0 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">Ver semana atual</button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="border-primary/20 bg-primary/[0.03]"><CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground"><CalendarDays className="h-5 w-5 text-primary" /><span><strong className="text-foreground">Semana {semana}/{ano}:</strong> comparação de segunda a domingo apenas dentro desta semana.</span></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base">Colheita por dia da semana</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={porDiaGrafico}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="curto" /><YAxis tick={{ fontSize: 11 }} /><Tooltip {...tooltipStyle} formatter={(valor, nome) => [formatarNumero(valor), nome === "hastes_colhidas" ? "Hastes colhidas" : "Cestos"]} /><Legend /><Bar dataKey="hastes_colhidas" name="Hastes colhidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="cestos" name="Cestos" fill="hsl(42 80% 55%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base">Resumo por dia — Semana {semana}</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 text-left">Dia</th><th className="px-2 py-3 text-right">Hastes colhidas</th><th className="px-2 py-3 text-right">Cestos</th><th className="px-2 py-3 text-right">Lançamentos</th></tr></thead><tbody>{analise.porDiaSemana.map((linha) => <LinhaTabela key={linha.numero}><td className="px-2 py-3 font-medium">{linha.nome}</td><td className="px-2 py-3 text-right font-semibold text-primary">{formatarNumero(linha.hastes_colhidas)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.cestos)}</td><td className="px-2 py-3 text-right">{formatarNumero(linha.registros)}</td></LinhaTabela>)}</tbody></table></CardContent></Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="criterios" className="space-y-5">
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4 text-primary" />Critérios de cálculo e controle</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 text-left">Controle</th><th className="px-2 py-3 text-left">Regra aplicada</th></tr></thead><tbody><LinhaTabela><td className="px-2 py-3 font-medium">Escopo</td><td className="px-2 py-3">Somente variedades da lista oficial de crisântemos. Statice, Limonium e Girassol são excluídos.</td></LinhaTabela><LinhaTabela><td className="px-2 py-3 font-medium">Nomes de variedade</td><td className="px-2 py-3">Aliases como Cal.Pink, Desb. e Sobert Vanilla são consolidados no nome oficial antes dos cálculos.</td></LinhaTabela><LinhaTabela><td className="px-2 py-3 font-medium">Hastes</td><td className="px-2 py-3">Usa hastes gravadas e, em registros antigos, aplica a conversão segura por cesto para evitar valores zerados.</td></LinhaTabela><LinhaTabela><td className="px-2 py-3 font-medium">Área</td><td className="px-2 py-3">Cada canteiro único com colheita no período corresponde a {AREA_M2_POR_CANTEIRO.toLocaleString("pt-BR")} m².</td></LinhaTabela><LinhaTabela><td className="px-2 py-3 font-medium">Descarte</td><td className="px-2 py-3">Quantidade de descarte é tratada como hastes descartadas. Taxa = descartadas ÷ (colhidas + descartadas).</td></LinhaTabela><LinhaTabela><td className="px-2 py-3 font-medium">Volume de dados</td><td className="px-2 py-3">Busca os registros do ano com paginação para evitar corte por limite de 1.000 ou 2.000 linhas.</td></LinhaTabela></tbody></table></CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
