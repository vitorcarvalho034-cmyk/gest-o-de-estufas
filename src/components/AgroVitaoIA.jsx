import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Mic, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canteirosAPI } from "@/api/supabaseClient";

const SUGESTOES = [
  "O que está plantado na Estufa 4, Lado B, Vão 10?",
  "O que está plantado na Estufa 1, Lado A, Vão 5?",
  "O que está plantado na Estufa 2, Lado B, Vão 30?",
];

const NUMEROS_SIMPLES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
};

function normalizarTexto(texto = "") {
  let resultado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\bvinte e (um|uma)\b/g, "21")
    .replace(/\bvinte e dois\b/g, "22")
    .replace(/\bvinte e tres\b/g, "23")
    .replace(/\bvinte e quatro\b/g, "24")
    .replace(/\bvinte e cinco\b/g, "25")
    .replace(/\bvinte e seis\b/g, "26")
    .replace(/\bvinte e sete\b/g, "27")
    .replace(/\bvinte e oito\b/g, "28")
    .replace(/\bvinte e nove\b/g, "29")
    .replace(/\btrinta e (um|uma)\b/g, "31")
    .replace(/\btrinta e dois\b/g, "32");

  Object.entries(NUMEROS_SIMPLES)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([palavra, numero]) => {
      resultado = resultado.replace(new RegExp(`\\b${palavra}\\b`, "g"), String(numero));
    });

  return resultado.replace(/\s+/g, " ").trim();
}

function extrairNumero(texto, padrao) {
  const encontrado = texto.match(padrao);
  return encontrado ? Number(encontrado[1]) : null;
}

function interpretarConsulta(texto) {
  const normalizado = normalizarTexto(texto);
  const estufa = extrairNumero(normalizado, /(?:estufa|e)\s*(?:de\s*)?(\d{1,2})\b/);
  const vao = extrairNumero(normalizado, /(?:vao|v)\s*(?:de\s*)?(\d{1,2})\b/);
  const canteiro = extrairNumero(normalizado, /(?:canteiro|cant|c)\s*(?:de\s*)?(\d{1,2})\b/);

  let lado = null;
  if (/(?:lado|l)\s*(?:a|alpha)\b/.test(normalizado)) lado = "A";
  if (/(?:lado|l)\s*(?:b|be|beta)\b/.test(normalizado)) lado = "B";

  return { estufa, lado, vao, canteiro, normalizado };
}

function nomeVariedades(canteiro) {
  const nomes = (canteiro.variedades || [])
    .map((item) => item?.nome || item?.variedade)
    .filter(Boolean);
  return nomes.length ? nomes.join(", ") : "variedade não informada";
}

function falar(texto, habilitado) {
  if (!habilitado || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 1;
  fala.pitch = 1;
  window.speechSynthesis.speak(fala);
}

export default function AgroVitaoIA() {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [resposta, setResposta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [escutando, setEscutando] = useState(false);
  const [vozAtiva, setVozAtiva] = useState(true);
  const reconhecimentoRef = useRef(null);
  const arrasteRef = useRef(null);
  const ignorarCliqueRef = useRef(false);
  const [arrastando, setArrastando] = useState(false);
  const [posicao, setPosicao] = useState(() => {
    try {
      const salva = JSON.parse(localStorage.getItem("agro-vitao-posicao") || "null");
      return salva && Number.isFinite(salva.x) && Number.isFinite(salva.y) ? salva : null;
    } catch (_) {
      return null;
    }
  });

  const suportaReconhecimento = useMemo(() => {
    return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => () => {
    reconhecimentoRef.current?.stop?.();
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  function fechar() {
    reconhecimentoRef.current?.stop?.();
    setEscutando(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setAberto(false);
  }

  async function consultar(textoOriginal = pergunta) {
    const texto = textoOriginal.trim();
    if (!texto) {
      toast.error("Fale ou digite uma pergunta para o Agro Vitão IA.");
      return;
    }

    const local = interpretarConsulta(texto);
    setTranscricao(texto);
    setConsultando(true);
    setResposta("");

    try {
      if (!local.estufa || !local.lado || !local.vao) {
        const mensagem = "Para eu consultar o plantio, informe Estufa, Lado e Vão. Exemplo: o que está plantado na Estufa 4, Lado B, Vão 10?";
        setResposta(mensagem);
        falar(mensagem, vozAtiva);
        return;
      }

      const canteiros = await canteirosAPI.list();
      const encontrados = (Array.isArray(canteiros) ? canteiros : [])
        .filter((canteiro) => Number(canteiro.estufa) === local.estufa)
        .filter((canteiro) => String(canteiro.lado || "").toUpperCase() === local.lado)
        .filter((canteiro) => Number(canteiro.vao) === local.vao)
        .filter((canteiro) => !local.canteiro || Number(canteiro.numero) === local.canteiro)
        .filter((canteiro) => (canteiro.variedades || []).length > 0 || Number(canteiro.total_mudas || 0) > 0)
        .sort((a, b) => Number(a.numero) - Number(b.numero));

      if (!encontrados.length) {
        const localFalado = `Estufa ${local.estufa}, Lado ${local.lado}, Vão ${local.vao}${local.canteiro ? `, Canteiro ${local.canteiro}` : ""}`;
        const mensagem = `Não encontrei plantio ativo em ${localFalado}. Confira o local ou veja se o plantio já foi registrado.`;
        setResposta(mensagem);
        falar(mensagem, vozAtiva);
        return;
      }

      const resumoCanteiros = encontrados.map((canteiro) => {
        const quantidade = Number(canteiro.total_mudas || 0);
        const mudas = quantidade > 0 ? `, com ${quantidade.toLocaleString("pt-BR")} mudas` : "";
        return `Canteiro ${canteiro.numero}: ${nomeVariedades(canteiro)}${mudas}`;
      });
      const tituloLocal = `Na Estufa ${local.estufa}, Lado ${local.lado}, Vão ${local.vao}`;
      const mensagem = `${tituloLocal}, encontrei ${resumoCanteiros.join(". ")}.`;
      setResposta(mensagem);
      falar(mensagem, vozAtiva);
    } catch (erro) {
      console.error("Agro Vitão IA — erro na consulta:", erro);
      const mensagem = "Não consegui consultar os plantios agora. Verifique a conexão e tente novamente.";
      setResposta(mensagem);
      falar(mensagem, vozAtiva);
    } finally {
      setConsultando(false);
    }
  }

  function iniciarVoz() {
    if (!suportaReconhecimento) {
      toast.error("Este navegador não oferece reconhecimento de voz. Você pode digitar a pergunta.");
      return;
    }

    const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = "pt-BR";
    reconhecimento.interimResults = false;
    reconhecimento.continuous = false;
    reconhecimento.maxAlternatives = 1;
    reconhecimentoRef.current = reconhecimento;

    reconhecimento.onstart = () => setEscutando(true);
    reconhecimento.onerror = (evento) => {
      setEscutando(false);
      if (evento.error !== "aborted") toast.error("Não consegui ouvir. Verifique a permissão do microfone e tente novamente.");
    };
    reconhecimento.onend = () => setEscutando(false);
    reconhecimento.onresult = (evento) => {
      const texto = evento.results?.[0]?.[0]?.transcript || "";
      setPergunta(texto);
      consultar(texto);
    };
    reconhecimento.start();
  }

  function iniciarArraste(evento) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    const retangulo = evento.currentTarget.getBoundingClientRect();
    arrasteRef.current = {
      pointerId: evento.pointerId,
      offsetX: evento.clientX - retangulo.left,
      offsetY: evento.clientY - retangulo.top,
      moveu: false,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
    };
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    setArrastando(true);
  }

  function moverArraste(evento) {
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;
    const margem = 8;
    const margemInferior = window.innerWidth < 1024 ? 96 : 16;
    const maxX = Math.max(margem, window.innerWidth - 64 - margem);
    const maxY = Math.max(margem, window.innerHeight - 64 - margemInferior);
    const x = Math.min(maxX, Math.max(margem, evento.clientX - arraste.offsetX));
    const y = Math.min(maxY, Math.max(margem, evento.clientY - arraste.offsetY));
    if (Math.abs(evento.clientX - arraste.inicioX) > 5 || Math.abs(evento.clientY - arraste.inicioY) > 5) arraste.moveu = true;
    setPosicao({ x, y });
  }

  function terminarArraste(evento) {
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;
    evento.currentTarget.releasePointerCapture?.(evento.pointerId);
    if (arraste.moveu) {
      ignorarCliqueRef.current = true;
      setTimeout(() => { ignorarCliqueRef.current = false; }, 0);
      setPosicao((atual) => {
        if (atual) localStorage.setItem("agro-vitao-posicao", JSON.stringify(atual));
        return atual;
      });
    }
    arrasteRef.current = null;
    setArrastando(false);
  }

  return <>
    <button
      type="button"
      aria-label="Abrir Agro Vitão IA"
      title="Arraste para mover · toque para falar com o Vitão"
      onPointerDown={iniciarArraste}
      onPointerMove={moverArraste}
      onPointerUp={terminarArraste}
      onPointerCancel={terminarArraste}
      onClick={() => { if (!ignorarCliqueRef.current) setAberto(true); }}
      style={posicao ? { left: `${posicao.x}px`, top: `${posicao.y}px`, right: "auto", bottom: "auto" } : undefined}
      className={`fixed right-4 bottom-24 lg:bottom-6 z-[60] h-16 w-16 touch-none rounded-full border-2 border-white/60 bg-emerald-700/55 p-1 shadow-lg shadow-emerald-950/20 backdrop-blur transition-[transform,opacity,background-color] duration-200 hover:scale-105 hover:bg-emerald-700/90 hover:opacity-100 focus:outline-none focus:ring-4 focus:ring-emerald-300/50 ${arrastando ? "scale-105 cursor-grabbing opacity-100" : "cursor-grab opacity-65"}`}
    >
      <img src="/vitao-avatar-sem-borda.png" alt="Agro Vitão IA" draggable="false" className="pointer-events-none h-full w-full rounded-full object-cover" />
      <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
    </button>

    <Dialog open={aberto} onOpenChange={(valor) => (valor ? setAberto(true) : fechar())}>
      <DialogContent className="sm:max-w-lg gap-0 overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 p-5 pr-12 text-white">
          <button type="button" onClick={fechar} className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white" aria-label="Fechar Agro Vitão IA"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-3">
            <img src="/vitao-avatar-sem-borda.png" alt="Vitão" className="h-16 w-16 rounded-full border-2 border-white/60 object-cover shadow-lg" />
            <div><DialogTitle className="flex items-center gap-2 text-xl text-white">Agro Vitão IA <Sparkles className="h-4 w-4 text-amber-300" /></DialogTitle><DialogDescription className="mt-1 text-emerald-50/85">Técnico das Estufas · Primeiro teste de consulta</DialogDescription></div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
            <strong>Posso consultar o que está plantado.</strong> Diga Estufa, Lado e Vão. Eu respondo na tela e por voz.
          </div>

          {transcricao && <div className="rounded-lg bg-muted px-3 py-2 text-xs"><span className="font-semibold">Entendi:</span> {transcricao}</div>}

          {resposta && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground"><div className="mb-2 flex items-center gap-2 font-semibold text-primary"><Bot className="h-4 w-4" /> Agro Vitão IA</div>{resposta}</div>}

          <div className="flex flex-wrap gap-2">{SUGESTOES.map((sugestao) => <button key={sugestao} type="button" onClick={() => { setPergunta(sugestao); consultar(sugestao); }} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">{sugestao}</button>)}</div>

          <div className="flex items-end gap-2">
            <textarea value={pergunta} onChange={(evento) => setPergunta(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter" && !evento.shiftKey) { evento.preventDefault(); consultar(); } }} placeholder="Ex.: O que está plantado na Estufa 4, Lado B, Vão 10?" rows={3} className="min-h-[80px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="flex flex-col gap-2"><Button type="button" size="icon" variant={escutando ? "destructive" : "outline"} onClick={iniciarVoz} disabled={consultando} title="Falar com o Agro Vitão IA" className={escutando ? "animate-pulse" : ""}>{escutando ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button><Button type="button" size="icon" onClick={() => consultar()} disabled={consultando} title="Consultar"><>{consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</></Button></div>
          </div>

          <button type="button" onClick={() => setVozAtiva((valor) => !valor)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">{vozAtiva ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}{vozAtiva ? "Resposta por voz ativada" : "Resposta por voz desativada"}</button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
