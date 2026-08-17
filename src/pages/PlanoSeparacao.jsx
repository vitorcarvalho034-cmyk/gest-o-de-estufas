import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Edit3, Loader2, RefreshCw, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { colheitasAPI, planoSeparacaoAPI, previsaoColheitaAPI } from "@/api/supabaseClient";
import { isVariedadeFixa, isVariedadeGirassol, normalizarVariedade } from "@/lib/coresVariedades";
import { getHastesColheita, getHastesPorCesto } from "@/lib/colheitaHastes";

const DESTINOS = [
  { key: "oferta", label: "Oferta", campo: "cestos_oferta", hastesPorCesto: 60, emoji: "🌸", cor: "amber" },
  { key: "mercado", label: "Mercado", campo: "cestos_mercado", hastesPorCesto: 60, emoji: "🛒", cor: "emerald" },
  { key: "barracao", label: "Barracão", campo: "cestos_barracao", hastesPorCesto: 50, emoji: "🏠", cor: "blue" },
];

const CORES = {
  amber: { card: "border-amber-200 bg-amber-50/60", value: "text-amber-700", bar: "bg-amber-500", input: "border-amber-200 focus:border-amber-500" },
  emerald: { card: "border-emerald-200 bg-emerald-50/60", value: "text-emerald-700", bar: "bg-emerald-500", input: "border-emerald-200 focus:border-emerald-500" },
  blue: { card: "border-blue-200 bg-blue-50/60", value: "text-blue-700", bar: "bg-blue-500", input: "border-blue-200 focus:border-blue-500" },
};

const semanaAtual = () => moment().isoWeek();
const anoAtual = () => moment().isoWeekYear();
const valorInteiro = (valor) => { const n = parseInt(valor, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
const isCrisantemo = (variedade) => !isVariedadeFixa(variedade) && !isVariedadeGirassol(variedade);
const isAnastasia = (variedade = "") => String(variedade).toLowerCase().includes("anastasia");

function periodoSemana(semana, ano) {
  const inicio = moment().isoWeekYear(ano).isoWeek(semana).startOf("isoWeek");
  return `${inicio.format("DD/MM")} a ${inicio.clone().add(5, "days").format("DD/MM")}`;
}

function destinoChave(destino = "") {
  const valor = String(destino).toLowerCase();
  if (valor.includes("oferta")) return "oferta";
  if (valor.includes("mercado")) return "mercado";
  if (valor.includes("barrac")) return "barracao";
  return null;
}

function montarProgresso(colheitas) {
  const resultado = {};
  const avulsas = {};
  colheitas.forEach((colheita) => {
    const variedade = normalizarVariedade(colheita.variedade || "Sem variedade");
    const destino = destinoChave(colheita.destino);
    if (!destino) return;
    const chave = `${variedade}::${destino}`;
    const cestos = Number(colheita.cestos) || 0;
    resultado[chave] = (resultado[chave] || 0) + cestos;
    const emCestos = cestos * getHastesPorCesto(colheita);
    const semCesto = Math.max(0, getHastesColheita(colheita) - emCestos);
    if (semCesto > 0) {
      if (!avulsas[chave]) avulsas[chave] = { hastes: 0, fator: getHastesPorCesto(colheita) };
      avulsas[chave].hastes += semCesto;
    }
  });
  Object.entries(avulsas).forEach(([chave, item]) => {
    if (item.fator > 0) resultado[chave] = (resultado[chave] || 0) + Math.floor(item.hastes / item.fator);
  });
  return resultado;
}

function ProgressoDestino({ destino, planejado, colhido }) {
  const estilo = CORES[destino.cor];
  const diferenca = colhido - planejado;
  const excedeu = planejado > 0 && diferenca > 0;
  const completo = planejado > 0 && diferenca === 0;
  const percentual = planejado > 0 ? Math.min(100, Math.round((colhido / planejado) * 100)) : 0;
  return <div className={`rounded-lg border p-3 ${estilo.card}`}>
    <div className="flex items-center justify-between gap-2"><p className={`text-xs font-bold ${estilo.value}`}>{destino.emoji} {destino.label}</p>{excedeu ? <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">+{diferenca} acima</span> : completo ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-muted-foreground">faltam {Math.max(0, -diferenca)}</span>}</div>
    <div className="flex items-end justify-between mt-2"><p className={`text-xl font-bold ${excedeu ? "text-red-700" : estilo.value}`}>{colhido}<span className="text-xs font-medium text-muted-foreground"> / {planejado}</span></p><p className="text-[10px] text-muted-foreground">cestos</p></div>
    <div className="h-1.5 rounded-full bg-white/80 mt-2 overflow-hidden"><div className={`h-full rounded-full ${excedeu ? "bg-red-500" : estilo.bar}`} style={{ width: `${percentual}%` }} /></div>
  </div>;
}

export default function PlanoSeparacao() {
  const [semana, setSemana] = useState(semanaAtual());
  const [ano, setAno] = useState(anoAtual());
  const [previsoes, setPrevisoes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [progresso, setProgresso] = useState({});
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [bancoPronto, setBancoPronto] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ oferta: "", mercado: "", barracao: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarDados(); }, [semana, ano]);

  async function carregarDados(silencioso = false) {
    if (silencioso) setAtualizando(true); else setLoading(true);
    try {
      const [previsoesDados, colheitasDados] = await Promise.all([previsaoColheitaAPI.list(2000), colheitasAPI.listByAno(ano)]);
      setPrevisoes(previsoesDados.filter((item) => item.semana === semana && item.ano === ano && isCrisantemo(item.variedade)));
      setProgresso(montarProgresso(colheitasDados.filter((item) => moment(item.data_colheita).isoWeek() === semana && moment(item.data_colheita).isoWeekYear() === ano && isCrisantemo(item.variedade))));
      try {
        setPlanos(await planoSeparacaoAPI.listBySemana(semana, ano));
        setBancoPronto(true);
      } catch (erroPlano) {
        console.warn("Tabela plano_separacao indisponível:", erroPlano);
        setPlanos([]);
        setBancoPronto(false);
      }
    } catch (erro) {
      console.error("Erro ao carregar Plano de Separação:", erro);
      toast.error("Não foi possível carregar os dados da semana");
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }

  const variedades = useMemo(() => {
    const mapa = {};
    previsoes.forEach((item) => {
      const variedade = normalizarVariedade(item.variedade || "Sem variedade");
      if (!mapa[variedade]) mapa[variedade] = { variedade, hastesPrevistas: 0 };
      mapa[variedade].hastesPrevistas += Number(item.hastes_previstas ?? item.pressas_previstas) || 0;
    });
    planos.forEach((item) => {
      const variedade = normalizarVariedade(item.variedade || "Sem variedade");
      if (!mapa[variedade]) mapa[variedade] = { variedade, hastesPrevistas: 0 };
      mapa[variedade].plano = item;
    });
    return Object.values(mapa).sort((a, b) => a.variedade.localeCompare(b.variedade, "pt-BR"));
  }, [previsoes, planos]);

  const totais = useMemo(() => {
    const resultado = { planejado: 0, colhido: 0, oferta: 0, mercado: 0, barracao: 0 };
    variedades.forEach((item) => DESTINOS.forEach((destino) => {
      resultado.planejado += Number(item.plano?.[destino.campo]) || 0;
      const colhido = progresso[`${item.variedade}::${destino.key}`] || 0;
      resultado.colhido += colhido;
      resultado[destino.key] += colhido;
    }));
    return resultado;
  }, [variedades, progresso]);

  function navegarSemana(direcao) {
    const data = moment().isoWeekYear(ano).isoWeek(semana).add(direcao, "week");
    setSemana(data.isoWeek());
    setAno(data.isoWeekYear());
  }

  function abrirEdicao(item) {
    const plano = item.plano || {};
    const somenteOferta = isAnastasia(item.variedade);
    setEditando(item);
    setForm({ oferta: plano.cestos_oferta?.toString() ?? "", mercado: somenteOferta ? "0" : (plano.cestos_mercado?.toString() ?? ""), barracao: somenteOferta ? "0" : (plano.cestos_barracao?.toString() ?? ""), observacao: plano.observacao || "" });
  }

  async function salvarPlano() {
    if (!editando) return;
    const somenteOferta = isAnastasia(editando.variedade);
    const oferta = valorInteiro(form.oferta);
    const mercado = somenteOferta ? 0 : valorInteiro(form.mercado);
    const barracao = somenteOferta ? 0 : valorInteiro(form.barracao);
    if ((oferta + mercado + barracao) === 0) { toast.error("Defina pelo menos um cesto para o plano"); return; }
    setSalvando(true);
    try {
      await planoSeparacaoAPI.upsert(semana, ano, editando.variedade, { cestos_oferta: oferta, cestos_mercado: mercado, cestos_barracao: barracao, observacao: form.observacao.trim() || null });
      toast.success(`Plano de ${editando.variedade} salvo`);
      setEditando(null);
      await carregarDados(true);
    } catch (erro) {
      console.error("Erro ao salvar plano:", erro);
      toast.error("Não foi possível salvar. Confira se a tabela Plano de Separação foi criada no Supabase.");
    } finally { setSalvando(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-primary/10"><ClipboardList className="w-7 h-7 text-primary" /></div><div><h1 className="text-2xl sm:text-3xl font-bold">Plano de Separação</h1><p className="text-sm text-muted-foreground">Crisântemos: roteiro em cestos para Oferta, Mercado e Barracão</p></div></div><Button variant="outline" onClick={() => carregarDados(true)} disabled={atualizando} className="gap-2 w-fit"><RefreshCw className={`w-4 h-4 ${atualizando ? "animate-spin" : ""}`} /> Atualizar colheitas</Button></div>

    {!bancoPronto && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Falta ativar o salvamento do Plano de Separação.</strong> A tela mostra previsões e colheitas, mas os planos só poderão ser salvos após criar a tabela no Supabase.</div>}

    <div className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3"><button aria-label="Semana anterior" onClick={() => navegarSemana(-1)} className="p-2 rounded-lg hover:bg-muted"><ChevronLeft className="w-5 h-5" /></button><div className="text-center"><div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /><p className="text-lg font-bold">Semana {semana}/{ano}</p></div><p className="text-xs text-muted-foreground">{periodoSemana(semana, ano)}</p></div><button aria-label="Próxima semana" onClick={() => navegarSemana(1)} className="p-2 rounded-lg hover:bg-muted"><ChevronRight className="w-5 h-5" /></button></div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Cestos planejados</p><p className="text-2xl font-bold">{totais.planejado}</p></div><div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Cestos colhidos</p><p className="text-2xl font-bold text-primary">{totais.colhido}</p></div><div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Oferta · Mercado</p><p className="text-2xl font-bold"><span className="text-amber-700">{totais.oferta}</span><span className="text-muted-foreground text-base"> · </span><span className="text-emerald-700">{totais.mercado}</span></p></div><div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Barracão</p><p className="text-2xl font-bold text-blue-700">{totais.barracao}</p></div></div>

    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground"><strong className="text-foreground">Como usar:</strong> defina os cestos desejados de cada variedade. Durante a semana, os cartões puxam automaticamente as colheitas lançadas. Ao completar uma meta, fica conferido; se ultrapassar, aparece em vermelho para evitar desbalancear a separação.</div>

    {variedades.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Target className="w-8 h-8 text-muted-foreground mx-auto mb-3" /><p className="font-semibold">Nenhuma previsão de crisântemo nesta semana</p><p className="text-sm text-muted-foreground mt-1">Cadastre as previsões primeiro para montar o roteiro de separação.</p></div> : <div className="space-y-4">{variedades.map((item) => {
      const plano = item.plano || {};
      const planejado = Object.fromEntries(DESTINOS.map((destino) => [destino.key, Number(plano[destino.campo]) || 0]));
      const colhido = Object.fromEntries(DESTINOS.map((destino) => [destino.key, progresso[`${item.variedade}::${destino.key}`] || 0]));
      const totalPlanejado = Object.values(planejado).reduce((soma, valor) => soma + valor, 0);
      const totalColhido = Object.values(colhido).reduce((soma, valor) => soma + valor, 0);
      const hastesDistribuidas = DESTINOS.reduce((soma, destino) => soma + planejado[destino.key] * destino.hastesPorCesto, 0);
      const alertas = DESTINOS.filter((destino) => planejado[destino.key] > 0 && colhido[destino.key] > planejado[destino.key]);
      return <section key={item.variedade} className="bg-card border rounded-xl overflow-hidden"><div className="p-5 border-b flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h2 className="text-lg font-bold">{item.variedade}</h2><p className="text-sm text-muted-foreground">Previsão: <strong className="text-foreground">{item.hastesPrevistas.toLocaleString("pt-BR")} hastes</strong>{totalPlanejado > 0 && <> · Plano: <strong className="text-foreground">{totalPlanejado} cestos</strong></>}{hastesDistribuidas > 0 && <span className="text-xs"> ({hastesDistribuidas} hastes distribuídas)</span>}</p>{isAnastasia(item.variedade) && <p className="text-xs text-amber-700 mt-1">Anastasia: planejamento exclusivo para Oferta.</p>}</div><Button onClick={() => abrirEdicao(item)} variant={item.plano ? "outline" : "default"} className="gap-2 w-fit"><Edit3 className="w-4 h-4" /> {item.plano ? "Ajustar plano" : "Definir plano"}</Button></div>
        {!item.plano ? <div className="p-5 text-sm text-muted-foreground">Ainda não há divisão definida. Clique em <strong>Definir plano</strong> para informar os cestos de cada destino.</div> : <><>{(alertas.length > 0 || (totalPlanejado > 0 && totalColhido > totalPlanejado)) && <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><div><strong>Alerta de equilíbrio:</strong> {alertas.map((destino) => `${destino.label} está ${colhido[destino.key] - planejado[destino.key]} cesto(s) acima`).join(" · ") || "A variedade já ultrapassou o total planejado."}</div></div>}</><div className="grid md:grid-cols-3 gap-3 p-5">{DESTINOS.map((destino) => <ProgressoDestino key={destino.key} destino={destino} planejado={planejado[destino.key]} colhido={colhido[destino.key]} />)}</div><div className="px-5 pb-5 flex flex-wrap gap-2 text-xs">{DESTINOS.map((destino) => { const falta = planejado[destino.key] - colhido[destino.key]; return falta > 0 ? <span key={destino.key} className="rounded-full bg-muted px-2.5 py-1">Faltam <strong>{falta}</strong> para {destino.label}</span> : null; })}{totalPlanejado > 0 && totalColhido === totalPlanejado && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 font-semibold">Plano da variedade concluído</span>}</div></>}</section>;
    })}</div>}

    <Dialog open={Boolean(editando)} onOpenChange={(aberto) => !aberto && setEditando(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Plano de {editando?.variedade}</DialogTitle><DialogDescription>Informe somente os cestos que o líder deve separar durante a semana.</DialogDescription></DialogHeader><div className="rounded-lg bg-muted/60 p-3 text-sm">Previsão da semana: <strong>{editando?.hastesPrevistas?.toLocaleString("pt-BR")} hastes</strong></div><div className="grid gap-3">{DESTINOS.map((destino) => { const bloqueado = isAnastasia(editando?.variedade) && destino.key !== "oferta"; return <label key={destino.key} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${bloqueado ? "opacity-50 bg-muted" : CORES[destino.cor].card}`}><span className="font-semibold text-sm">{destino.emoji} {destino.label}<span className="block text-[10px] text-muted-foreground font-normal">{destino.hastesPorCesto} hastes/cesto</span></span><input type="number" min="0" disabled={bloqueado} value={form[destino.key]} onChange={(e) => setForm((atual) => ({ ...atual, [destino.key]: e.target.value }))} className={`w-20 h-10 rounded-md border bg-background px-2 text-center font-bold outline-none disabled:bg-muted ${CORES[destino.cor].input}`} placeholder="0" /></label>; })}</div><div><label className="text-sm font-medium">Observação <span className="text-muted-foreground font-normal">(opcional)</span></label><textarea rows={2} value={form.observacao} onChange={(e) => setForm((atual) => ({ ...atual, observacao: e.target.value }))} placeholder="Ex.: priorizar Mercado até quarta-feira." className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" /></div><DialogFooter><Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button><Button disabled={salvando || !bancoPronto} onClick={salvarPlano} className="gap-2"><Save className="w-4 h-4" /> {salvando ? "Salvando..." : "Salvar plano"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
