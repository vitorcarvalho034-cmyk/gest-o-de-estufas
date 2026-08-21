import { AGRO_VITAO_TECNICO_RESUMO } from "../../src/lib/agroVitaoBaseTecnica.js";

const MAX_PERGUNTA = 1_500;
const MAX_CONTEXTO_CLIENTE = 64_000;
const JANELA_RATE_LIMIT_MS = 60_000;
const LIMITE_POR_JANELA = 20;
const acessosRecentes = new Map();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://flores-da-terra.netlify.app",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function responder(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function textoSeguro(valor, maximo = 120) {
  return String(valor ?? "").replace(/[<>]/g, "").trim().slice(0, maximo);
}

function numeroSeguro(valor, padrao = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

function dataLocalHoje() {
  const agora = new Date();
  const deslocamento = agora.getTimezoneOffset() * 60_000;
  return new Date(agora.getTime() - deslocamento).toISOString().slice(0, 10);
}

function inicioJanelaIso(dias = 14) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString().slice(0, 10);
}

function origemDaRequisicao(event) {
  const forwarded = event.headers?.["x-forwarded-for"] || event.headers?.["X-Forwarded-For"] || "";
  return forwarded.split(",")[0].trim() || "desconhecido";
}

function respeitaLimite(event) {
  const origem = origemDaRequisicao(event);
  const agora = Date.now();
  const registros = (acessosRecentes.get(origem) || []).filter((instante) => agora - instante < JANELA_RATE_LIMIT_MS);
  if (registros.length >= LIMITE_POR_JANELA) return false;
  registros.push(agora);
  acessosRecentes.set(origem, registros);
  return true;
}

function normalizarNome(valor = "") {
  return textoSeguro(valor, 100)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isFlorDestinoFixo(variedade = "") {
  const nome = normalizarNome(variedade);
  return ["sinzii", "tasmania", "limonium", "klara", "piuma", "shooting star", "oshi", "supreme", "girassol"].some((item) => nome.includes(item));
}

function normalizarDestino(valor = "") {
  const nome = normalizarNome(valor);
  if (nome.includes("oferta") && nome.includes("80")) return "Oferta 80";
  if (nome.includes("oferta")) return "Oferta 60";
  if (nome.includes("mercado")) return "Mercado";
  if (nome.includes("barrac")) return "Barracão";
  return "";
}

function normalizarLado(valor = "") {
  const lado = normalizarNome(valor);
  if (["a", "lado a", "alpha"].includes(lado)) return "A";
  if (["b", "lado b", "be", "beta"].includes(lado)) return "B";
  return "";
}

function limitarLista(lista, limite) {
  return Array.isArray(lista) ? lista.slice(0, limite) : [];
}

function somarColheitas(colheitas = []) {
  const porVariedade = {};
  const porEstufa = {};
  const porDestino = {};
  const porDia = {};
  let hastes = 0;
  let cestos = 0;

  colheitas.forEach((item) => {
    const hastesItem = numeroSeguro(item.hastes ?? item.pressas) || numeroSeguro(item.cestos) * (normalizarDestino(item.destino) === "Barracão" ? 50 : 60) + numeroSeguro(item.hastes_avulsas);
    const cestosItem = numeroSeguro(item.cestos);
    const variedade = textoSeguro(item.variedade || "Sem variedade");
    const estufa = numeroSeguro(item.estufa);
    const destino = normalizarDestino(item.destino) || "Outro";
    hastes += hastesItem;
    cestos += cestosItem;
    porVariedade[variedade] = (porVariedade[variedade] || 0) + hastesItem;
    if (estufa) porEstufa[`Estufa ${estufa}`] = (porEstufa[`Estufa ${estufa}`] || 0) + hastesItem;
    porDestino[destino] = { hastes: (porDestino[destino]?.hastes || 0) + hastesItem, cestos: (porDestino[destino]?.cestos || 0) + cestosItem };
    const data = String(item.data_colheita || "").slice(0, 10);
    if (data) {
      if (!porDia[data]) porDia[data] = { hastes: 0, cestos: 0, lancamentos: 0, variedades: {}, estufas: {}, destinos: {} };
      const dia = porDia[data];
      dia.hastes += hastesItem;
      dia.cestos += cestosItem;
      dia.lancamentos += 1;
      dia.variedades[variedade] = (dia.variedades[variedade] || 0) + hastesItem;
      if (estufa) dia.estufas[`Estufa ${estufa}`] = (dia.estufas[`Estufa ${estufa}`] || 0) + hastesItem;
      dia.destinos[destino] = { hastes: (dia.destinos[destino]?.hastes || 0) + hastesItem, cestos: (dia.destinos[destino]?.cestos || 0) + cestosItem };
    }
  });

  const ordenar = (objeto) => Object.entries(objeto)
    .sort((a, b) => numeroSeguro(b[1]?.hastes ?? b[1]) - numeroSeguro(a[1]?.hastes ?? a[1]))
    .slice(0, 12)
    .map(([nome, valores]) => ({ nome, ...(typeof valores === "object" ? valores : { hastes: valores }) }));

  const porDiaResumido = Object.fromEntries(Object.entries(porDia).map(([data, valores]) => [data, {
    hastes: Math.round(valores.hastes),
    cestos: Math.round(valores.cestos),
    lancamentos: valores.lancamentos,
    por_destino: valores.destinos,
    variedades_lideres: ordenar(valores.variedades),
    estufas_lideres: ordenar(valores.estufas),
  }]));
  return { hastes: Math.round(hastes), cestos: Math.round(cestos), por_destino: porDestino, variedades_lideres: ordenar(porVariedade), estufas_lideres: ordenar(porEstufa), por_dia: porDiaResumido };
}

function extrairNomesVariedades(canteiro = {}) {
  return limitarLista(canteiro.variedades, 8)
    .map((item) => textoSeguro(item?.nome || item?.variedade, 80))
    .filter(Boolean);
}

function resumirContextoBruto(dados = {}) {
  const canteiros = limitarLista(dados.canteiros, 300)
    .map((item) => ({
      estufa: numeroSeguro(item.estufa),
      lado: textoSeguro(item.lado, 2).toUpperCase(),
      vao: numeroSeguro(item.vao),
      canteiro: numeroSeguro(item.numero ?? item.canteiro),
      variedades: extrairNomesVariedades(item),
      mudas: numeroSeguro(item.total_mudas),
      finalizado_em: item.data_finalizacao || null,
    }))
    .filter((item) => item.estufa && item.lado && item.vao && item.variedades.length);

  const colheitas = limitarLista(dados.colheitas, 1_500);
  const descartes = limitarLista(dados.descartes, 600);
  const previsoes = limitarLista(dados.previsoes, 300);
  const planos = limitarLista(dados.planos, 150);
  const conferencia = limitarLista(dados.conferencias, 60);

  return {
    referencia: dados.referencia || { data: dataLocalHoje() },
    canteiros_ativos: canteiros,
    colheita_ultimos_14_dias: somarColheitas(colheitas),
    descartes_ultimos_14_dias: descartes.map((item) => ({
      data: item.data_descarte,
      variedade: textoSeguro(item.variedade || "Sem variedade"),
      hastes: numeroSeguro(item.quantidade ?? item.hastes ?? item.pressas),
      motivo: textoSeguro(item.motivo, 100),
    })),
    previsao_recente: previsoes.map((item) => ({
      semana: numeroSeguro(item.semana),
      ano: numeroSeguro(item.ano),
      variedade: textoSeguro(item.variedade || "Sem variedade"),
      hastes_previstas: numeroSeguro(item.hastes_previstas ?? item.pressas_previstas),
    })),
    plano_separacao_atual: planos.map((item) => ({
      semana: numeroSeguro(item.semana),
      ano: numeroSeguro(item.ano),
      variedade: textoSeguro(item.variedade || "Sem variedade"),
      oferta: numeroSeguro(item.cestos_oferta),
      mercado: numeroSeguro(item.cestos_mercado),
      barracao: numeroSeguro(item.cestos_barracao),
    })),
    conferencia_recente: conferencia.map((item) => ({
      data: item.data_conferencia,
      oferta: numeroSeguro(item.recebido_oferta),
      mercado: numeroSeguro(item.recebido_mercado),
      barracao: numeroSeguro(item.recebido_barracao),
    })),
    pauta_atual: dados.pauta ? {
      semana: numeroSeguro(dados.pauta.semana),
      ano: numeroSeguro(dados.pauta.ano),
      oferta: numeroSeguro(dados.pauta.env_oferta),
      mercado: numeroSeguro(dados.pauta.env_mercado),
      buques: numeroSeguro(dados.pauta.env_buques),
      ofertas_extras: limitarLista(dados.pauta.ofertas_extras, 30),
    } : null,
  };
}

async function consultarTabela(supabaseUrl, supabaseKey, tabela, query) {
  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tabela}?${query}`;
  const resposta = await fetch(url, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!resposta.ok) throw new Error(`Supabase ${tabela}: ${resposta.status}`);
  return resposta.json();
}

async function carregarContextoDoSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const inicio = inicioJanelaIso(14);
  const hoje = dataLocalHoje();
  const inicioQuery = encodeURIComponent(inicio);
  const hojeQuery = encodeURIComponent(hoje);
  const resultados = await Promise.allSettled([
    consultarTabela(supabaseUrl, supabaseKey, "canteiros", "select=estufa,lado,vao,numero,variedades,total_mudas,data_finalizacao&order=estufa.asc,lado.asc,vao.asc,numero.asc"),
    consultarTabela(supabaseUrl, supabaseKey, "colheitas", `select=estufa,lado,vao,canteiro,variedade,destino,cestos,hastes,pressas,hastes_avulsas,data_colheita&data_colheita=gte.${inicioQuery}&data_colheita=lte.${hojeQuery}&order=data_colheita.desc&limit=1500`),
    consultarTabela(supabaseUrl, supabaseKey, "descartes", `select=variedade,quantidade,hastes,pressas,motivo,data_descarte&data_descarte=gte.${inicioQuery}&data_descarte=lte.${hojeQuery}&order=data_descarte.desc&limit=600`),
    consultarTabela(supabaseUrl, supabaseKey, "previsao_colheita", "select=semana,ano,variedade,hastes_previstas,pressas_previstas&order=ano.desc,semana.desc&limit=300"),
    consultarTabela(supabaseUrl, supabaseKey, "plano_separacao", "select=semana,ano,variedade,cestos_oferta,cestos_mercado,cestos_barracao&order=ano.desc,semana.desc&limit=150"),
    consultarTabela(supabaseUrl, supabaseKey, "conferencia_colhido_recebido", "select=data_conferencia,recebido_oferta,recebido_mercado,recebido_barracao&order=data_conferencia.desc&limit=60"),
    consultarTabela(supabaseUrl, supabaseKey, "pauta_semana", "select=semana,ano,env_oferta,env_mercado,env_buques,ofertas_extras&order=ano.desc,semana.desc&limit=1"),
  ]);

  const obter = (indice, padrao) => resultados[indice].status === "fulfilled" ? resultados[indice].value : padrao;
  return resumirContextoBruto({
    referencia: { data: hoje, janela_dados: `últimos 14 dias desde ${inicio}` },
    canteiros: obter(0, []),
    colheitas: obter(1, []),
    descartes: obter(2, []),
    previsoes: obter(3, []),
    planos: obter(4, []),
    conferencias: obter(5, []),
    pauta: obter(6, [])[0] || null,
  });
}

function contextoClienteSeguro(contexto) {
  if (!contexto || typeof contexto !== "object") return null;
  const texto = JSON.stringify(contexto);
  if (texto.length > MAX_CONTEXTO_CLIENTE) return null;
  return contexto;
}

function instrucoesDoSistema(contexto) {
  return `Você é o Agro Vitão IA, técnico digital da Flores da Terra, uma operação de flores de corte em estufas em Andradas/MG.

Sua linguagem é brasileira, simples, direta, cordial e prática. Você entende perguntas escritas ou transcritas por voz com variações naturais de linguagem. Fale de forma breve, mas cite números e locais quando vierem do contexto operacional.

Você tem dois papéis: (1) consultar e explicar os dados reais do sistema; (2) dar orientação técnica educativa sobre crisântemo, girassol, Limonium, Statice e folhagens.

INTEGRIDADE DOS DADOS:
- Use somente os dados fornecidos no CONTEXTO OPERACIONAL. Se não houver dado suficiente, diga isso claramente e indique onde o líder pode conferir no app.
- Não invente lançamentos, metas, variedades plantadas, disponibilidade, números ou diagnósticos.
- Os nomes das colunas legadas podem conter "pressas", mas para o usuário a unidade é sempre "hastes".
- A Colhido × Recebido é apenas para crisântemos.

COMANDOS DE COLHEITA:
- Se o usuário pedir para registrar, lançar, anotar ou incluir uma colheita, responda em JSON compatível com o esquema solicitado. Isto só PREENCHE a tela de confirmação: jamais confirma, grava, envia ou altera dados.
- Reúna, quando informados: estufa, lado, vão, canteiro, variedade, destino, cestos/maços/hastes avulsas e data.
- Se faltar algum requisito, retorne um comando incompleto e explique exatamente o que falta.
- Para Statice, Limonium e Girassol, o destino no app é Barracão; para demais variedades, aceite Barracão, Mercado, Oferta 60 ou Oferta 80.

ORIENTAÇÃO TÉCNICA:
${AGRO_VITAO_TECNICO_RESUMO}

FORMATO DE SAÍDA:
Devolva exclusivamente um JSON válido seguindo o esquema. Não use Markdown, não use crases e não inclua nenhum texto fora do JSON. Quando não for um comando de colheita, devolva comando_colheita com e_comando=false, completo=false, faltando=[], números como 0 e textos como string vazia; nunca use null.

CONTEXTO OPERACIONAL (dados reais resumidos):
${JSON.stringify(contexto)}`;
}

const ESQUEMA_RESPOSTA = {
  type: "json_schema",
  json_schema: {
    name: "resposta_agro_vitao",
    strict: true,
    schema: {
      type: "object",
      properties: {
        resposta: { type: "string" },
        tipo: { type: "string", enum: ["consulta", "tecnico", "comando_colheita"] },
        confianca: { type: "string", enum: ["alta", "media", "baixa"] },
        comando_colheita: {
          type: "object",
          properties: {
            e_comando: { type: "boolean" },
            completo: { type: "boolean" },
            faltando: { type: "array", items: { type: "string" } },
            estufa: { type: "integer" },
            lado: { type: "string" },
            vao: { type: "integer" },
            canteiro: { type: "integer" },
            variedade: { type: "string" },
            destino: { type: "string" },
            cestos: { type: "integer" },
            macos: { type: "integer" },
            hastes_avulsas: { type: "integer" },
            data_colheita: { type: "string" },
          },
          required: ["e_comando", "completo", "faltando", "estufa", "lado", "vao", "canteiro", "variedade", "destino", "cestos", "macos", "hastes_avulsas", "data_colheita"],
          additionalProperties: false,
        },
      },
      required: ["resposta", "tipo", "confianca", "comando_colheita"],
      additionalProperties: false,
    },
  },
};

function validarComando(comando, canteiros = []) {
  if (!comando?.e_comando) return null;

  const estufa = Number.isInteger(comando.estufa) && comando.estufa > 0 && comando.estufa < 100 ? comando.estufa : null;
  const lado = normalizarLado(comando.lado);
  const vao = Number.isInteger(comando.vao) && comando.vao > 0 && comando.vao < 100 ? comando.vao : null;
  const canteiro = Number.isInteger(comando.canteiro) && comando.canteiro > 0 && comando.canteiro < 100 ? comando.canteiro : null;
  const variedade = textoSeguro(comando.variedade, 100) || null;
  const destinoOriginal = normalizarDestino(comando.destino);
  const destino = variedade && isFlorDestinoFixo(variedade) ? "Barracão" : destinoOriginal;
  const cestos = Number.isInteger(comando.cestos) && comando.cestos > 0 ? comando.cestos : 0;
  const macos = Number.isInteger(comando.macos) && comando.macos > 0 ? comando.macos : 0;
  const hastesAvulsas = Number.isInteger(comando.hastes_avulsas) && comando.hastes_avulsas > 0 ? comando.hastes_avulsas : 0;
  const faltando = new Set((Array.isArray(comando.faltando) ? comando.faltando : []).map((item) => textoSeguro(item, 40)).filter(Boolean));

  if (!estufa) faltando.add("Estufa");
  if (!lado) faltando.add("Lado");
  if (!vao) faltando.add("Vão");
  if (!canteiro) faltando.add("Canteiro");
  if (!variedade) faltando.add("Variedade");
  if (!destino) faltando.add("Destino");
  if (!cestos && !macos && !hastesAvulsas) faltando.add("Quantidade");

  const canteiroConhecido = estufa && lado && vao && canteiro
    ? canteiros.find((item) => numeroSeguro(item.estufa) === estufa && String(item.lado || "").toUpperCase() === lado && numeroSeguro(item.canteiro) === canteiro && numeroSeguro(item.vao) === vao)
    : null;
  const variedadeNoCanteiro = variedade && canteiroConhecido
    ? (canteiroConhecido.variedades || []).some((nome) => normalizarNome(nome) === normalizarNome(variedade))
    : true;
  if (canteiroConhecido && !variedadeNoCanteiro) faltando.add("confirme a variedade deste canteiro");

  const completo = faltando.size === 0;
  return {
    eComando: true,
    completo,
    faltando: [...faltando],
    prefill: completo ? {
      estufa: String(estufa),
      lado,
      vao: String(vao),
      canteiro: String(canteiro),
      variedade,
      destino,
      cestos: cestos ? String(cestos) : "",
      macos: macos ? String(macos) : "",
      hastes_avulsas: hastesAvulsas ? String(hastesAvulsas) : "",
      modo: "cestos",
      data_colheita: /^\d{4}-\d{2}-\d{2}$/.test(comando.data_colheita || "") ? comando.data_colheita : dataLocalHoje(),
    } : null,
  };
}

async function chamarModelo(pergunta, contexto) {
  const apiKey = process.env.AGRO_VITAO_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.AGRO_VITAO_LLM_BASE_URL || process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
  const modelo = process.env.AGRO_VITAO_MODELO || "gpt-5-mini";

  if (!apiKey) throw new Error("AGRO_VITAO_SEM_CHAVE");

  const parametros = {
    model: modelo,
    temperature: 0.2,
    response_format: ESQUEMA_RESPOSTA,
    messages: [
      { role: "system", content: instrucoesDoSistema(contexto) },
      { role: "user", content: textoSeguro(pergunta, MAX_PERGUNTA) },
    ],
  };
  if (/^gpt-5/.test(modelo)) {
    parametros.max_completion_tokens = 4_096;
    parametros.reasoning = { effort: "minimal" };
  } else {
    parametros.max_tokens = 4_096;
  }

  const resposta = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(parametros),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    console.error("Agro Vitão IA — falha do modelo:", resposta.status, detalhe.slice(0, 500));
    throw new Error(`AGRO_VITAO_MODELO_${resposta.status}`);
  }

  const corpo = await resposta.json();
  const escolha = corpo?.choices?.[0];
  const conteudo = escolha?.message?.content;
  if (!conteudo) {
    console.error("Agro Vitão IA — resposta vazia do modelo:", JSON.stringify({
      modelo: corpo?.model,
      motivo_finalizacao: escolha?.finish_reason,
      uso: corpo?.usage,
    }));
    throw new Error("AGRO_VITAO_RESPOSTA_VAZIA");
  }
  try {
    return JSON.parse(conteudo);
  } catch (_) {
    throw new Error("AGRO_VITAO_JSON_INVALIDO");
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return responder(204, {});
  if (event.httpMethod !== "POST") return responder(405, { erro: "Método não permitido." });
  if (!respeitaLimite(event)) return responder(429, { erro: "Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente." });

  let dados;
  try {
    dados = JSON.parse(event.body || "{}");
  } catch (_) {
    return responder(400, { erro: "Não consegui ler a consulta." });
  }

  const pergunta = textoSeguro(dados.pergunta, MAX_PERGUNTA);
  if (!pergunta) return responder(400, { erro: "Escreva ou fale uma pergunta para o Agro Vitão IA." });

  try {
    const contextoServidor = await carregarContextoDoSupabase().catch((erro) => {
      console.warn("Agro Vitão IA — contexto do Supabase indisponível:", erro.message);
      return null;
    });
    const contextoDoApp = contextoClienteSeguro(dados.contexto);
    const contexto = contextoServidor || contextoDoApp || {
      referencia: { data: dataLocalHoje() },
      aviso: "Contexto operacional não disponível nesta consulta.",
    };
    const resultado = await chamarModelo(pergunta, contexto);
    const comando = validarComando(resultado.comando_colheita, contexto.canteiros_ativos || []);

    return responder(200, {
      resposta: textoSeguro(resultado.resposta, 4_000) || "Não consegui organizar uma resposta segura agora.",
      tipo: ["consulta", "tecnico", "comando_colheita"].includes(resultado.tipo) ? resultado.tipo : "consulta",
      confianca: ["alta", "media", "baixa"].includes(resultado.confianca) ? resultado.confianca : "baixa",
      comando,
      fonte_contexto: contextoServidor ? "servidor" : contextoDoApp ? "app" : "indisponivel",
    });
  } catch (erro) {
    console.error("Agro Vitão IA — erro seguro:", erro.message);
    if (erro.message === "AGRO_VITAO_SEM_CHAVE") {
      return responder(503, { erro: "A IA ainda não foi ativada no servidor. Configure a chave segura do provedor no Netlify." });
    }
    return responder(502, { erro: "Não consegui consultar o Agro Vitão IA agora. Verifique a conexão e tente novamente." });
  }
}
