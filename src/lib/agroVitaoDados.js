import moment from "moment";
import "moment/locale/pt-br";
import {
  canteirosAPI,
  colheitasAPI,
  descartesAPI,
  previsaoColheitaAPI,
  planoSeparacaoAPI,
  pautaSemanaAPI,
  colhidoRecebidoAPI,
} from "@/api/supabaseClient";
import { getHastesColheita } from "@/lib/colheitaHastes";
import { normalizarVariedade } from "@/lib/coresVariedades";

moment.locale("pt-br");

let cacheContexto = null;
let cacheCriadoEm = 0;
const CACHE_MS = 60 * 1000;

const DESTINOS = [
  { chave: "oferta", nome: "Oferta" },
  { chave: "mercado", nome: "Mercado" },
  { chave: "barracao", nome: "Barracão" },
];

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarNumero(valor) {
  return Math.round(numero(valor)).toLocaleString("pt-BR");
}

function normalizarTexto(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function destinoChave(destino = "") {
  const texto = normalizarTexto(destino);
  if (texto.includes("oferta")) return "oferta";
  if (texto.includes("mercado")) return "mercado";
  if (texto.includes("barrac")) return "barracao";
  return "outros";
}

function extrairNumero(texto, padrao) {
  const encontrado = texto.match(padrao);
  return encontrado ? Number(encontrado[1]) : null;
}

function interpretarLocal(pergunta = "") {
  const texto = normalizarTexto(pergunta);
  const estufa = extrairNumero(texto, /(?:estufa|e)\s*(?:de\s*)?(\d{1,2})\b/);
  const vao = extrairNumero(texto, /(?:vao|v)\s*(?:de\s*)?(\d{1,2})\b/);
  const canteiro = extrairNumero(texto, /(?:canteiro|cant|c)\s*(?:de\s*)?(\d{1,2})\b/);
  let lado = null;
  if (/(?:lado|l)\s*(?:a|alpha)\b/.test(texto)) lado = "A";
  if (/(?:lado|l)\s*(?:b|be|beta)\b/.test(texto)) lado = "B";
  return { estufa, vao, canteiro, lado };
}

function dataPerguntada(texto) {
  const pergunta = normalizarTexto(texto);
  if (pergunta.includes("ontem")) return moment().subtract(1, "day");
  if (pergunta.includes("anteontem")) return moment().subtract(2, "day");
  return moment();
}

function periodoPerguntado(texto) {
  const pergunta = normalizarTexto(texto);
  if (pergunta.includes("ontem") || pergunta.includes("anteontem") || pergunta.includes("hoje")) return "dia";
  if (pergunta.includes("mes")) return "mes";
  return "semana";
}

function registrosDoPeriodo(registros, campoData, texto) {
  const periodo = periodoPerguntado(texto);
  const referencia = dataPerguntada(texto);
  return (Array.isArray(registros) ? registros : []).filter((registro) => {
    const data = registro?.[campoData];
    if (!data) return false;
    const item = moment(data);
    if (periodo === "dia") return item.format("YYYY-MM-DD") === referencia.format("YYYY-MM-DD");
    if (periodo === "mes") return item.month() === referencia.month() && item.year() === referencia.year();
    return item.isoWeek() === referencia.isoWeek() && item.isoWeekYear() === referencia.isoWeekYear();
  });
}

function nomeVariedades(canteiro) {
  const nomes = (canteiro?.variedades || [])
    .map((item) => item?.nome || item?.variedade)
    .filter(Boolean);
  return nomes.length ? nomes.join(", ") : "variedade não informada";
}

function agruparColheitas(colheitas) {
  const total = { hastes: 0, cestos: 0, lancamentos: 0, destinos: {}, variedades: {}, estufas: {} };
  (colheitas || []).forEach((colheita) => {
    const hastes = getHastesColheita(colheita);
    const cestos = numero(colheita.cestos);
    const destino = destinoChave(colheita.destino);
    const variedade = normalizarVariedade(colheita.variedade || "Sem variedade");
    const estufa = numero(colheita.estufa) || null;
    total.hastes += hastes;
    total.cestos += cestos;
    total.lancamentos += 1;
    if (!total.destinos[destino]) total.destinos[destino] = { hastes: 0, cestos: 0 };
    total.destinos[destino].hastes += hastes;
    total.destinos[destino].cestos += cestos;
    if (!total.variedades[variedade]) total.variedades[variedade] = { hastes: 0, cestos: 0 };
    total.variedades[variedade].hastes += hastes;
    total.variedades[variedade].cestos += cestos;
    if (estufa) {
      if (!total.estufas[estufa]) total.estufas[estufa] = { hastes: 0, cestos: 0 };
      total.estufas[estufa].hastes += hastes;
      total.estufas[estufa].cestos += cestos;
    }
  });
  return total;
}

function maiorItem(mapa, campo = "hastes") {
  const itens = Object.entries(mapa || {});
  if (!itens.length) return null;
  return itens.sort((a, b) => numero(b[1][campo]) - numero(a[1][campo]))[0];
}

function textoPeriodo(texto) {
  const periodo = periodoPerguntado(texto);
  const data = dataPerguntada(texto);
  if (periodo === "dia") return data.format("DD/MM");
  if (periodo === "mes") return data.format("MMMM/YYYY");
  return `semana ${data.isoWeek()}/${data.isoWeekYear()}`;
}

async function carregarContexto(forcar = false) {
  if (!forcar && cacheContexto && Date.now() - cacheCriadoEm < CACHE_MS) return cacheContexto;
  const agora = moment();
  const semana = agora.isoWeek();
  const ano = agora.isoWeekYear();
  const [canteiros, colheitas, descartes, previsoes, planos, pauta, conferencias] = await Promise.all([
    canteirosAPI.list(),
    colheitasAPI.listByAno(ano),
    descartesAPI.listByAno(ano),
    previsaoColheitaAPI.list(2000),
    planoSeparacaoAPI.listBySemana(semana, ano).catch(() => []),
    pautaSemanaAPI.getBySemana(semana, ano).catch(() => null),
    colhidoRecebidoAPI.list(120).catch(() => []),
  ]);
  cacheContexto = { canteiros, colheitas, descartes, previsoes, planos, pauta, conferencias, semana, ano, agora };
  cacheCriadoEm = Date.now();
  return cacheContexto;
}

function responderPlantio(contexto, pergunta) {
  const local = interpretarLocal(pergunta);
  if (!local.estufa || !local.lado || !local.vao) {
    return "Para consultar um plantio, informe Estufa, Lado e Vão. Exemplo: o que está plantado na Estufa 4, Lado B, Vão 10?";
  }
  const encontrados = (contexto.canteiros || [])
    .filter((canteiro) => numero(canteiro.estufa) === local.estufa)
    .filter((canteiro) => String(canteiro.lado || "").toUpperCase() === local.lado)
    .filter((canteiro) => numero(canteiro.vao) === local.vao)
    .filter((canteiro) => !local.canteiro || numero(canteiro.numero) === local.canteiro)
    .filter((canteiro) => (canteiro.variedades || []).length > 0 || numero(canteiro.total_mudas) > 0)
    .sort((a, b) => numero(a.numero) - numero(b.numero));

  if (!encontrados.length) {
    return `Não encontrei plantio ativo na Estufa ${local.estufa}, Lado ${local.lado}, Vão ${local.vao}${local.canteiro ? `, Canteiro ${local.canteiro}` : ""}. Confira o local ou veja se o plantio já foi registrado.`;
  }
  const linhas = encontrados.map((canteiro) => {
    const mudas = numero(canteiro.total_mudas);
    return `Canteiro ${canteiro.numero}: ${nomeVariedades(canteiro)}${mudas ? `, com ${formatarNumero(mudas)} mudas` : ""}`;
  });
  return `Na Estufa ${local.estufa}, Lado ${local.lado}, Vão ${local.vao}, encontrei ${linhas.join(". ")}.`;
}

function responderColheita(contexto, pergunta) {
  const registros = registrosDoPeriodo(contexto.colheitas, "data_colheita", pergunta);
  const resumo = agruparColheitas(registros);
  const periodo = textoPeriodo(pergunta);
  if (!resumo.lancamentos) return `Não encontrei colheitas registradas em ${periodo}.`;
  const partesDestino = DESTINOS
    .filter((destino) => resumo.destinos[destino.chave]?.cestos || resumo.destinos[destino.chave]?.hastes)
    .map((destino) => `${destino.nome}: ${formatarNumero(resumo.destinos[destino.chave].cestos)} cestos`);
  const melhorVariedade = maiorItem(resumo.variedades);
  const melhorEstufa = maiorItem(resumo.estufas);
  const complementoVariedade = melhorVariedade ? ` A variedade com mais hastes foi ${melhorVariedade[0]}, com ${formatarNumero(melhorVariedade[1].hastes)} hastes.` : "";
  const complementoEstufa = melhorEstufa ? ` A Estufa ${melhorEstufa[0]} liderou com ${formatarNumero(melhorEstufa[1].hastes)} hastes.` : "";
  return `Em ${periodo}, foram colhidas ${formatarNumero(resumo.hastes)} hastes em ${formatarNumero(resumo.cestos)} cestos, com ${resumo.lancamentos} lançamentos. ${partesDestino.length ? `Por destino: ${partesDestino.join(", ")}.` : ""}${complementoVariedade}${complementoEstufa}`;
}

function responderMaiorColheita(contexto, pergunta, tipo) {
  const registros = registrosDoPeriodo(contexto.colheitas, "data_colheita", pergunta);
  const resumo = agruparColheitas(registros);
  const mapa = tipo === "estufa" ? resumo.estufas : resumo.variedades;
  const maior = maiorItem(mapa);
  if (!maior) return `Não encontrei colheitas registradas em ${textoPeriodo(pergunta)}.`;
  const nome = tipo === "estufa" ? `A Estufa ${maior[0]}` : `${maior[0]}`;
  return `${nome} foi a que mais colheu em ${textoPeriodo(pergunta)}, com ${formatarNumero(maior[1].hastes)} hastes e ${formatarNumero(maior[1].cestos)} cestos.`;
}

function responderDescarte(contexto, pergunta) {
  const registros = registrosDoPeriodo(contexto.descartes, "data_descarte", pergunta);
  const total = registros.reduce((soma, descarte) => soma + numero(descarte.quantidade ?? descarte.hastes ?? descarte.pressas), 0);
  if (!registros.length) return `Não encontrei descarte registrado em ${textoPeriodo(pergunta)}.`;
  return `Em ${textoPeriodo(pergunta)}, foram descartadas ${formatarNumero(total)} hastes em ${registros.length} lançamento(s) de descarte.`;
}

function responderPrevisao(contexto, pergunta) {
  const semana = contexto.semana;
  const ano = contexto.ano;
  const previsoes = (contexto.previsoes || []).filter((item) => numero(item.semana) === semana && numero(item.ano) === ano);
  const hastes = previsoes.reduce((soma, item) => soma + numero(item.hastes_previstas ?? item.pressas_previstas), 0);
  const variedades = new Set(previsoes.map((item) => normalizarVariedade(item.variedade || "Sem variedade")));
  if (!previsoes.length) return `Não encontrei previsão cadastrada para a semana ${semana}/${ano}.`;
  return `Para a semana ${semana}/${ano}, a previsão é de ${formatarNumero(hastes)} hastes em ${variedades.size} variedades.`;
}

function responderPlano(contexto) {
  const planos = contexto.planos || [];
  if (!planos.length) return `Ainda não há Plano de Separação salvo para a semana ${contexto.semana}/${contexto.ano}.`;
  const registrosSemana = registrosDoPeriodo(contexto.colheitas, "data_colheita", "semana");
  const progresso = agruparColheitas(registrosSemana);
  const pendencias = [];
  planos.forEach((plano) => {
    const variedade = normalizarVariedade(plano.variedade || "Sem variedade");
    const realizado = progresso.variedades[variedade] || { cestos: 0 };
    const planejado = numero(plano.cestos_oferta) + numero(plano.cestos_mercado) + numero(plano.cestos_barracao);
    const falta = Math.max(0, planejado - numero(realizado.cestos));
    if (falta > 0) pendencias.push({ variedade, falta });
  });
  if (!pendencias.length) return `O plano de separação da semana está completo ou sem pendências registradas.`;
  const principais = pendencias.sort((a, b) => b.falta - a.falta).slice(0, 5);
  return `Ainda faltam cestos no plano da semana. Principais pendências: ${principais.map((item) => `${item.variedade}: ${item.falta} cestos`).join(", ")}.`;
}

function responderConferencia(contexto, pergunta) {
  const data = dataPerguntada(pergunta).format("YYYY-MM-DD");
  const conferencia = (contexto.conferencias || []).find((item) => item.data_conferencia === data);
  if (!conferencia) return `Não encontrei conferência Colhido × Recebido salva para ${dataPerguntada(pergunta).format("DD/MM")}.`;
  return `Na conferência de ${dataPerguntada(pergunta).format("DD/MM")}, foram recebidos ${formatarNumero(conferencia.recebido_oferta)} cestos de Oferta, ${formatarNumero(conferencia.recebido_mercado)} de Mercado e ${formatarNumero(conferencia.recebido_barracao)} de Barracão.`;
}

function responderPauta(contexto) {
  const pauta = contexto.pauta;
  if (!pauta) return `Ainda não há Pauta salva para a semana ${contexto.semana}/${contexto.ano}.`;
  const itens = [];
  if (numero(pauta.env_oferta)) itens.push(`Oferta enviada: ${formatarNumero(pauta.env_oferta)} caixas`);
  if (numero(pauta.env_mercado)) itens.push(`Mercado enviado: ${formatarNumero(pauta.env_mercado)} caixas`);
  if (numero(pauta.env_buques)) itens.push(`Buquês enviados: ${formatarNumero(pauta.env_buques)} caixas`);
  return itens.length ? `Pauta da semana ${contexto.semana}/${contexto.ano}: ${itens.join(", ")}.` : `A Pauta da semana ${contexto.semana}/${contexto.ano} ainda não tem envios preenchidos.`;
}

export async function responderAgroVitao(pergunta) {
  const texto = normalizarTexto(pergunta);
  const contexto = await carregarContexto();

  if (/(?:o que|qual).*plantad|plantado.*(?:estufa|vao|canteiro)|(?:estufa|vao|canteiro).*plantad/.test(texto)) return responderPlantio(contexto, pergunta);
  if (/(?:qual|que).*estufa.*(?:mais|maior).*(?:colheu|colheita)|estufa.*lider/.test(texto)) return responderMaiorColheita(contexto, pergunta, "estufa");
  if (/(?:qual|que).*variedade.*(?:mais|maior).*(?:colheu|colheita)|variedade.*lider/.test(texto)) return responderMaiorColheita(contexto, pergunta, "variedade");
  if (/descarte|descartou|descartar|perda/.test(texto)) return responderDescarte(contexto, pergunta);
  if (/conferencia|recebido|recebeu|chegou.*barracao|colhido.*recebido/.test(texto)) return responderConferencia(contexto, pergunta);
  if (/pauta|cooperflora|enviado/.test(texto)) return responderPauta(contexto);
  if (/previsao|previsto|prever/.test(texto)) return responderPrevisao(contexto, pergunta);
  if (/falta.*colher|o que.*falta|plano.*separacao|meta.*semana|como.*meta/.test(texto)) return responderPlano(contexto);
  if (/colheita|colheu|colhido|colher|hastes.*ontem|cestos.*ontem/.test(texto)) return responderColheita(contexto, pergunta);

  return "Ainda não entendi essa pergunta com segurança. Neste momento posso responder sobre plantios, estufas, colheita de hoje ou ontem, descarte, previsão, metas, plano de separação, conferência e pautas. Tente perguntar de forma direta, por exemplo: como foi a colheita ontem?";
}

function palavrasParaNumeros(texto = "") {
  const mapa = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30 };
  let resultado = normalizarTexto(texto);
  Object.entries(mapa).sort((a, b) => b[0].length - a[0].length).forEach(([palavra, valor]) => {
    resultado = resultado.replace(new RegExp(`\\b${palavra}\\b`, "g"), String(valor));
  });
  return resultado;
}

function extrairQuantidade(texto, padrao) {
  const encontrado = texto.match(padrao);
  return encontrado ? Number(encontrado[1]) : 0;
}

function encontrarVariedadeFalado(texto, canteiros) {
  const normalizado = normalizarTexto(texto);
  const candidatas = [...new Set((canteiros || []).flatMap((canteiro) => (canteiro.variedades || []).map((item) => item?.nome || item?.variedade)).filter(Boolean).map((nome) => normalizarVariedade(nome)))];
  const porTamanho = candidatas.sort((a, b) => b.length - a.length);
  return porTamanho.find((variedade) => normalizado.includes(normalizarTexto(variedade))) || null;
}

export async function interpretarComandoColheita(pergunta) {
  const texto = palavrasParaNumeros(pergunta);
  const eComando = /\b(registrar|registre|lancar|lance|anotar|anote)\b.*\b(colheita|cesto|cestos|hastes)\b|\b(colheita|cesto|cestos)\b.*\b(registrar|lancar|anotar)\b/.test(texto);
  if (!eComando) return { eComando: false };

  const contexto = await carregarContexto();
  const local = interpretarLocal(texto);
  const cestos = extrairQuantidade(texto, /(\d+)\s*cestos?\b/);
  const macos = extrairQuantidade(texto, /(\d+)\s*macos?\b/);
  const hastesAvulsas = extrairQuantidade(texto, /(\d+)\s*hastes?(?:\s*avulsas?)?\b/);
  const variedade = encontrarVariedadeFalado(texto, contexto.canteiros);
  let destino = "";
  if (/oferta\s*80/.test(texto)) destino = "Oferta 80";
  else if (/oferta/.test(texto)) destino = "Oferta 60";
  else if (/mercado/.test(texto)) destino = "Mercado";
  else if (/barrac/.test(texto)) destino = "Barracão";

  const faltando = [];
  if (!local.estufa) faltando.push("Estufa");
  if (!local.lado) faltando.push("Lado");
  if (!local.vao) faltando.push("Vão");
  if (!local.canteiro) faltando.push("Canteiro");
  if (!variedade) faltando.push("Variedade");
  if (!destino) faltando.push("Destino");
  if (!cestos && !macos && !hastesAvulsas) faltando.push("Quantidade");
  if (variedade?.toLowerCase().includes("anastasia") && destino && !destino.startsWith("Oferta")) {
    return { eComando: true, completo: false, mensagem: "Para Anastasia, o destino deve ser Oferta 60 ou Oferta 80. Diga novamente o destino para eu preparar a confirmação." };
  }
  if (faltando.length) {
    return { eComando: true, completo: false, mensagem: `Entendi que você quer registrar uma colheita, mas ainda falta informar: ${faltando.join(", ")}.` };
  }

  const prefill = {
    estufa: String(local.estufa),
    lado: local.lado,
    vao: String(local.vao),
    canteiro: String(local.canteiro),
    variedade,
    destino,
    cestos: cestos ? String(cestos) : "",
    macos: macos ? String(macos) : "",
    hastes_avulsas: hastesAvulsas ? String(hastesAvulsas) : "",
    modo: "cestos",
    data_colheita: moment().format("YYYY-MM-DD"),
  };
  const quantidades = [cestos ? `${cestos} cestos` : "", macos ? `${macos} maços` : "", hastesAvulsas ? `${hastesAvulsas} hastes avulsas` : ""].filter(Boolean).join(" e ");
  return {
    eComando: true,
    completo: true,
    prefill,
    mensagem: `Entendi: ${variedade}, Estufa ${local.estufa}, Lado ${local.lado}, Vão ${local.vao}, Canteiro ${local.canteiro}, ${destino}, ${quantidades}. Vou abrir a confirmação. Nada será salvo sem você confirmar.`,
  };
}

export function limparCacheAgroVitao() {
  cacheContexto = null;
  cacheCriadoEm = 0;
}
