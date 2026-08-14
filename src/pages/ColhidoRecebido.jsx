import { useEffect, useMemo, useState } from "react";
import { colheitasAPI, colhidoRecebidoAPI } from "@/api/supabaseClient";
import { isVariedadeFixa, isVariedadeGirassol, normalizarVariedade } from "@/lib/coresVariedades";
import { getHastesColheita, getHastesPorCesto } from "@/lib/colheitaHastes";
import { Button } from "@/components/ui/button";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit2,
  Minus,
  Save,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

const DESTINOS = [
  {
    key: "oferta",
    label: "Oferta",
    emoji: "🌸",
    campo: "recebido_oferta",
    cor: {
      painel: "bg-amber-50 border-amber-200",
      titulo: "text-amber-800",
      colhido: "text-amber-700",
      input: "border-amber-200 focus:border-amber-500",
    },
  },
  {
    key: "mercado",
    label: "Mercado",
    emoji: "🛒",
    campo: "recebido_mercado",
    cor: {
      painel: "bg-emerald-50 border-emerald-200",
      titulo: "text-emerald-800",
      colhido: "text-emerald-700",
      input: "border-emerald-200 focus:border-emerald-500",
    },
  },
  {
    key: "barracao",
    label: "Barracão",
    emoji: "🏠",
    campo: "recebido_barracao",
    cor: {
      painel: "bg-blue-50 border-blue-200",
      titulo: "text-blue-800",
      colhido: "text-blue-700",
      input: "border-blue-200 focus:border-blue-500",
    },
  },
];

// Hoje, as culturas não-crisântemo identificadas no sistema são as flores fixas
// e o Girassol. Elas ficam totalmente fora desta conferência.
function isCrisantemo(variedade) {
  return !isVariedadeFixa(variedade) && !isVariedadeGirassol(variedade);
}

function numeroInteiro(valor) {
  const numero = parseInt(valor, 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function formatarDiferenca(valor) {
  if (valor === 0) return "0";
  return valor > 0 ? `+${valor}` : String(valor);
}

function dataLocal(dataISO) {
  // Meio-dia evita que o fuso horário altere o dia selecionado.
  return new Date(`${dataISO}T12:00:00`);
}

function formatarDiaMes(dataISO) {
  return dataLocal(dataISO).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
}

function formatarSemanaAno(dataISO) {
  return dataLocal(dataISO).toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
  });
}

function StatusDiferenca({ diferenca }) {
  if (diferenca === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Conferido</span>;
  }
  if (diferenca < 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full"><TriangleAlert className="w-3.5 h-3.5" /> Faltam {Math.abs(diferenca)} cestos</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full"><ArrowDownToLine className="w-3.5 h-3.5" /> +{diferenca} cestos</span>;
}

export default function ColhidoRecebido() {
  const [dataSelecionada, setDataSelecionada] = useState(moment().format("YYYY-MM-DD"));
  const [colhido, setColhido] = useState({ oferta: 0, mercado: 0, barracao: 0 });
  const [cestosPorHastes, setCestosPorHastes] = useState({ oferta: 0, mercado: 0, barracao: 0 });
  const [recebido, setRecebido] = useState({ oferta: "", mercado: "", barracao: "" });
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const hoje = moment().format("YYYY-MM-DD");

  useEffect(() => {
    carregarConferencia(dataSelecionada);
  }, [dataSelecionada]);

  async function carregarConferencia(data) {
    setLoading(true);
    setSalvo(false);
    try {
      const ano = moment(data).year();
      const registros = await colheitasAPI.listByAno(ano);
      const doDia = registros.filter(c => c.data_colheita === data && isCrisantemo(c.variedade));
      const totais = { oferta: 0, mercado: 0, barracao: 0 };
      const cestosCompletosPorHastes = { oferta: 0, mercado: 0, barracao: 0 };
      const hastesAvulsasPorVariedade = {};

      doDia.forEach(colheita => {
        const destino = String(colheita.destino || "").toLowerCase();
        const chaveDestino = destino.includes("oferta") ? "oferta"
          : destino.includes("mercado") ? "mercado"
          : destino.includes("barrac") ? "barracao"
          : null;
        if (!chaveDestino) return;

        // Cestos já lançados entram diretamente na conferência.
        totais[chaveDestino] += Number(colheita.cestos) || 0;

        // Hastes sem cesto (avulsas ou maços) ficam acumuladas por variedade + destino.
        // Só geram um novo cesto quando completam o padrão daquele destino.
        const hastesDeCestos = (Number(colheita.cestos) || 0) * getHastesPorCesto(colheita);
        const hastesSemCesto = Math.max(0, getHastesColheita(colheita) - hastesDeCestos);
        if (hastesSemCesto <= 0) return;

        const variedade = normalizarVariedade(colheita.variedade || "Sem variedade");
        const chave = `${chaveDestino}::${variedade}`;
        if (!hastesAvulsasPorVariedade[chave]) {
          hastesAvulsasPorVariedade[chave] = {
            destino: chaveDestino,
            hastes: 0,
            hastesPorCesto: getHastesPorCesto(colheita),
          };
        }
        hastesAvulsasPorVariedade[chave].hastes += hastesSemCesto;
      });

      Object.values(hastesAvulsasPorVariedade).forEach(item => {
        if (item.hastesPorCesto > 0) {
          const cestosFormados = Math.floor(item.hastes / item.hastesPorCesto);
          totais[item.destino] += cestosFormados;
          cestosCompletosPorHastes[item.destino] += cestosFormados;
        }
      });

      setColhido(totais);
      setCestosPorHastes(cestosCompletosPorHastes);

      try {
        const conferencia = await colhidoRecebidoAPI.getByData(data);
        if (conferencia) {
          setRecebido({
            oferta: conferencia.recebido_oferta?.toString() ?? "",
            mercado: conferencia.recebido_mercado?.toString() ?? "",
            barracao: conferencia.recebido_barracao?.toString() ?? "",
          });
          setObservacao(conferencia.observacao || "");
          setSalvo(true);
        } else {
          setRecebido({ oferta: "", mercado: "", barracao: "" });
          setObservacao("");
        }
      } catch (erroConferencia) {
        // A página continua mostrando o colhido mesmo antes da tabela ser criada.
        console.warn("Conferência ainda indisponível:", erroConferencia);
        setRecebido({ oferta: "", mercado: "", barracao: "" });
        setObservacao("");
      }
    } catch (erro) {
      console.warn("Erro ao carregar Colhido × Recebido:", erro);
      toast.error("Não foi possível carregar as colheitas do dia");
    } finally {
      setLoading(false);
    }
  }

  const linhas = useMemo(() => DESTINOS.map(destino => {
    const totalColhido = colhido[destino.key] || 0;
    const totalRecebido = numeroInteiro(recebido[destino.key]);
    return {
      ...destino,
      totalColhido,
      totalRecebido,
      cestosPorHastes: cestosPorHastes[destino.key] || 0,
      diferenca: totalRecebido - totalColhido,
    };
  }), [colhido, cestosPorHastes, recebido]);

  const totalColhido = linhas.reduce((soma, item) => soma + item.totalColhido, 0);
  const totalRecebido = linhas.reduce((soma, item) => soma + item.totalRecebido, 0);
  const diferencaTotal = totalRecebido - totalColhido;
  const temLancamentoNoBarracao = Object.values(recebido).some(valor => valor !== "");

  function mudarDia(dias) {
    const proximaData = moment(dataSelecionada).add(dias, "days").format("YYYY-MM-DD");
    if (proximaData > hoje) return;
    setDataSelecionada(proximaData);
  }

  async function salvarConferencia() {
    if (!temLancamentoNoBarracao) {
      toast.error("Informe pelo menos uma contagem recebida no barracão");
      return;
    }
    setSalvando(true);
    try {
      await colhidoRecebidoAPI.upsert(dataSelecionada, {
        recebido_oferta: numeroInteiro(recebido.oferta),
        recebido_mercado: numeroInteiro(recebido.mercado),
        recebido_barracao: numeroInteiro(recebido.barracao),
        observacao: observacao.trim() || null,
      });
      setSalvo(true);
      toast.success("Conferência do dia salva com sucesso!");
    } catch (erro) {
      console.error("Erro ao salvar conferência:", erro);
      toast.error("Não foi possível salvar. Confirme se a tabela foi criada no Supabase.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Colhido × Recebido</h1>
            <p className="text-sm text-muted-foreground">Conferência diária de cestos de crisântemos</p>
          </div>
        </div>
        {salvo && <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-4 h-4" /> Conferência salva</span>}
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => mudarDia(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Dia anterior"><ChevronLeft className="w-5 h-5" /></button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /><p className="text-lg font-bold capitalize">{formatarDiaMes(dataSelecionada)}</p></div>
            <p className="text-xs text-muted-foreground capitalize">{formatarSemanaAno(dataSelecionada)}{dataSelecionada === hoje ? " · Hoje" : ""}</p>
          </div>
          <button onClick={() => mudarDia(1)} disabled={dataSelecionada >= hoje} className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30" aria-label="Próximo dia"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="mt-4 border-t pt-4">
          <label className="text-xs font-medium text-muted-foreground">Ir para outra data</label>
          <input type="date" max={hoje} value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} className="mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Como conferir:</strong> o lado esquerdo é calculado automaticamente pelas colheitas lançadas nas estufas. No lado direito, informe os cestos físicos que chegaram ao barracão. Statice, Limonium, Girassol e outras flores fixas não entram nesta tela.
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center"><ArrowUpFromLine className="w-5 h-5 text-primary mx-auto mb-2" /><p className="text-xs text-muted-foreground">Colhido nas estufas</p><p className="text-2xl font-bold">{totalColhido}</p><p className="text-xs text-muted-foreground">cestos</p></div>
        <div className="rounded-xl border bg-card p-4 text-center"><ArrowDownToLine className="w-5 h-5 text-primary mx-auto mb-2" /><p className="text-xs text-muted-foreground">Recebido no barracão</p><p className="text-2xl font-bold text-primary">{totalRecebido}</p><p className="text-xs text-muted-foreground">cestos</p></div>
        <div className={`rounded-xl border p-4 text-center ${diferencaTotal === 0 ? "bg-emerald-50 border-emerald-200" : diferencaTotal < 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}><Minus className={`w-5 h-5 mx-auto mb-2 ${diferencaTotal === 0 ? "text-emerald-600" : diferencaTotal < 0 ? "text-red-600" : "text-blue-600"}`} /><p className="text-xs text-muted-foreground">Diferença</p><p className={`text-2xl font-bold ${diferencaTotal === 0 ? "text-emerald-700" : diferencaTotal < 0 ? "text-red-700" : "text-blue-700"}`}>{formatarDiferenca(diferencaTotal)}</p><p className="text-xs text-muted-foreground">cestos</p></div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30 grid grid-cols-[1fr_100px_112px] sm:grid-cols-[1fr_130px_150px] gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destino</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Colhido</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Recebido</span>
        </div>
        <div className="divide-y">
          {linhas.map(item => (
            <div key={item.key} className="p-4 sm:p-5">
              <div className="grid grid-cols-[1fr_100px_112px] sm:grid-cols-[1fr_130px_150px] gap-2 items-center">
                <div><p className={`font-semibold ${item.cor.titulo}`}>{item.emoji} {item.label}</p><div className="mt-1"><StatusDiferenca diferenca={item.diferenca} /></div></div>
                <div className="text-center"><p className={`text-2xl font-bold ${item.cor.colhido}`}>{item.totalColhido}</p><p className="text-xs text-muted-foreground">cestos</p>{item.cestosPorHastes > 0 && <p className="text-[10px] text-primary font-medium mt-1">+{item.cestosPorHastes} por hastes avulsas</p>}</div>
                <div><input type="number" min="0" inputMode="numeric" disabled={salvo} value={recebido[item.key]} onChange={e => setRecebido(atual => ({ ...atual, [item.key]: e.target.value }))} placeholder="0" className={`w-full h-12 rounded-lg border bg-background text-center text-xl font-bold outline-none transition-colors disabled:bg-muted disabled:text-muted-foreground ${item.cor.input}`} /><p className="text-xs text-center text-muted-foreground mt-1">cestos</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-3">
        <label className="text-sm font-semibold">Observação da conferência <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <textarea value={observacao} disabled={salvo} onChange={e => setObservacao(e.target.value)} rows={3} placeholder="Ex.: 2 cestos ficaram na seleção; diferença conferida com a equipe." className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-60" />
      </div>

      <div className="flex justify-end gap-3 pb-6">
        {salvo && <Button variant="outline" onClick={() => setSalvo(false)} className="gap-2"><Edit2 className="w-4 h-4" /> Editar</Button>}
        <Button onClick={salvarConferencia} disabled={salvo || salvando} className="gap-2"><Save className="w-4 h-4" /> {salvando ? "Salvando..." : "Salvar Conferência"}</Button>
      </div>
    </div>
  );
}
