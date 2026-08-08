import { useState } from "react";
import { plantiosAPI, canteirosAPI } from "@/api/supabaseClient";
import { ClipboardList, Info, Plus, Trash2, AlertCircle, AlertTriangle, CheckCircle2, RotateCcw, X } from "lucide-react";
import { printCroquiFromPlantios } from "@/components/CroquiPrint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import { getVaosArray } from "@/lib/estufasConfig";

function getWeekNumber(date) {
  return moment(date).isoWeek();
}

const EMPTY_VARIEDADE = { variedade: "", quantidade: "" };

function emptyLado() {
  return {
    canteiros: [
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
      [{ ...EMPTY_VARIEDADE }],
    ],
  };
}

function emptyVao(data) {
  return {
    vaoNum: null,
    data: data || moment().format("YYYY-MM-DD"),
    ladoA: emptyLado(),
    ladoB: emptyLado(),
  };
}

// Componente de canteiro individual
function CanteiroBlock({ canteiro, variedades, onChange, ocupado, bloqueado }) {
  const total = variedades.reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);
  const over = total > 2000;

  function updateVariedade(idx, field, value) {
    const updated = variedades.map((v, i) => i === idx ? { ...v, [field]: value } : v);
    onChange(updated);
  }

  function addVariedade() {
    if (variedades.length >= 4) return;
    onChange([...variedades, { ...EMPTY_VARIEDADE }]);
  }

  function removeVariedade(idx) {
    const updated = variedades.filter((_, i) => i !== idx);
    onChange(updated.length > 0 ? updated : [{ ...EMPTY_VARIEDADE }]);
  }

  return (
    <div className={`rounded-lg border p-2.5 space-y-1.5 ${bloqueado ? "border-red-400 bg-red-50" : over ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/20"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground uppercase">C{canteiro}</span>
          {ocupado && !bloqueado && (
            <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 rounded px-1 py-0.5 font-medium">
              Ocupado
            </span>
          )}
          {bloqueado && (
            <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 rounded px-1 py-0.5 font-medium flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" /> Ciclo ativo
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold ${over ? "text-destructive" : total > 1600 ? "text-amber-600" : "text-muted-foreground"}`}>
          {total}/2000
        </span>
      </div>

      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${bloqueado ? "bg-red-400" : over ? "bg-destructive" : total > 1600 ? "bg-amber-400" : "bg-primary"}`}
          style={{ width: `${Math.min((total / 2000) * 100, 100)}%` }}
        />
      </div>

      {variedades.map((v, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_70px_22px] gap-1 items-center">
          <Input
            placeholder="Variedade"
            value={v.variedade}
            onChange={(e) => updateVariedade(idx, "variedade", e.target.value)}
            className="h-6 text-[11px] px-2"
          />
          <Input
            type="number"
            placeholder="Qtd"
            value={v.quantidade}
            onChange={(e) => updateVariedade(idx, "quantidade", e.target.value)}
            min={1}
            max={2000}
            className="h-6 text-[11px] px-2"
          />
          <button
            onClick={() => removeVariedade(idx)}
            className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {variedades.length < 4 && (
        <button
          onClick={addVariedade}
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" /> Variedade
        </button>
      )}

      {over && (
        <div className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="w-3 h-3" /> Limite excedido
        </div>
      )}
    </div>
  );
}

// Bloco de um vão (Lado A + Lado B)
function VaoBlock({ vaoData, index, vaosArray, canteirosOcupados, estufa, onUpdate, onRemove }) {
  const { vaoNum, data, ladoA, ladoB } = vaoData;

  const temCicloAtivo = vaoNum && canteirosOcupados.some(c => c.vao === vaoNum);

  function updateLadoCanteiro(lado, cantIdx, variedades) {
    const ladoKey = lado === "A" ? "ladoA" : "ladoB";
    const novoLado = {
      ...vaoData[ladoKey],
      canteiros: vaoData[ladoKey].canteiros.map((c, i) => i === cantIdx ? variedades : c),
    };
    onUpdate({ ...vaoData, [ladoKey]: novoLado });
  }

  function isCanteiroOcupado(lado, cantNum) {
    return canteirosOcupados.some(
      c => c.vao === vaoNum && c.lado === lado && c.numero === cantNum
    );
  }

  return (
    <div className={`border rounded-xl p-3 space-y-3 bg-card ${temCicloAtivo ? "border-red-300" : "border-border"}`}>
      {/* Header do vão */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">VÃO</span>
          <Select value={String(vaoNum || "")} onValueChange={(v) => onUpdate({ ...vaoData, vaoNum: parseInt(v) })}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {vaosArray.map((n) => (
                <SelectItem key={n} value={String(n)}>Vão {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="date"
          value={data}
          onChange={(e) => onUpdate({ ...vaoData, data: e.target.value })}
          className="h-7 text-xs w-36"
        />
        {temCicloAtivo && (
          <span className="flex items-center gap-1 text-[11px] bg-red-50 border border-red-200 text-red-700 rounded px-2 py-0.5 font-medium">
            <AlertTriangle className="w-3 h-3" /> Ciclo ativo — precisa fechar antes
          </span>
        )}
        <button
          onClick={onRemove}
          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
          title="Remover vão"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Lado B */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 px-1">Lado B</div>
        <div className="grid grid-cols-2 gap-2">
          {ladoB.canteiros.map((vars, idx) => (
            <CanteiroBlock
              key={idx}
              canteiro={idx + 1}
              variedades={vars}
              onChange={(v) => updateLadoCanteiro("B", idx, v)}
              ocupado={isCanteiroOcupado("B", idx + 1)}
              bloqueado={isCanteiroOcupado("B", idx + 1)}
            />
          ))}
        </div>
      </div>

      {/* Separador entrada */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div className="flex-1 border-t border-dashed border-border" />
        <span>↑ Entrada ↑</span>
        <div className="flex-1 border-t border-dashed border-border" />
      </div>

      {/* Lado A */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2 px-1">Lado A</div>
        <div className="grid grid-cols-2 gap-2">
          {ladoA.canteiros.map((vars, idx) => (
            <CanteiroBlock
              key={idx}
              canteiro={idx + 1}
              variedades={vars}
              onChange={(v) => updateLadoCanteiro("A", idx, v)}
              ocupado={isCanteiroOcupado("A", idx + 1)}
              bloqueado={isCanteiroOcupado("A", idx + 1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Dialog de conflito de ciclo ativo
function ConflitoCicloDialog({ open, conflitos, onFecharCanteiro, onFecharVao, onCancelar }) {
  const vaosUnicos = [...new Set(conflitos.map(c => c.vao))];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Ciclos Ativos Detectados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Os canteiros abaixo têm ciclos ativos. Para registrar o novo plantio, você precisa fechar esses ciclos primeiro.
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {conflitos.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    E{c.estufa} — {c.lado} — Vão {c.vao} — C{c.numero}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {(c.variedades || []).map(v => `${v.nome || v.variedade} (${v.quantidade})`).join(", ") || "Sem variedades"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFecharCanteiro(c)}
                  className="text-red-700 border-red-300 hover:bg-red-100 text-xs ml-2 shrink-0"
                >
                  Fechar Canteiro
                </Button>
              </div>
            ))}
          </div>

          {vaosUnicos.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Fechar vão inteiro:</p>
              <div className="flex flex-wrap gap-2">
                {vaosUnicos.map(vao => (
                  <Button
                    key={vao}
                    size="sm"
                    variant="outline"
                    onClick={() => onFecharVao(vao)}
                    className="text-orange-700 border-orange-300 hover:bg-orange-50 text-xs"
                  >
                    Fechar Vão {vao} inteiro
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancelar} className="gap-1.5">
              <X className="w-4 h-4" /> Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlantioEstufaDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState("select"); // "select" | "edit"
  const [estufa, setEstufa] = useState(null);
  const [vaos, setVaos] = useState([]);
  const [canteirosOcupados, setCanteirosOcupados] = useState([]);
  const [ultimaDataPlantio, setUltimaDataPlantio] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingCroqui, setLoadingCroqui] = useState(false);
  const [conflitosDialog, setConflitosDialog] = useState({ open: false, conflitos: [] });

  function reset() {
    setStep("select");
    setEstufa(null);
    setVaos([]);
    setCanteirosOcupados([]);
    setUltimaDataPlantio(null);
    setSaving(false);
    setConflitosDialog({ open: false, conflitos: [] });
  }

  async function handleCarregarCroqui() {
    if (!estufa) return;
    setLoadingCroqui(true);
    try {
      const [allPlantios, allCanteiros] = await Promise.all([
        plantiosAPI.list(),
        canteirosAPI.list(),
      ]);

      const safePlantios = Array.isArray(allPlantios) ? allPlantios : [];
      const safeCanteiros = Array.isArray(allCanteiros) ? allCanteiros : [];

      // Canteiros ocupados desta estufa
      const cantOcup = safeCanteiros.filter(c => c.estufa === estufa && (c.total_mudas || 0) > 0);
      setCanteirosOcupados(cantOcup);

      // Plantios desta estufa
      const plantiosEstufa = safePlantios.filter(p => p.estufa === estufa);

      if (plantiosEstufa.length === 0) {
        setVaos([emptyVao()]);
        setUltimaDataPlantio(null);
        setStep("edit");
        toast.info("Nenhum plantio anterior — croqui em branco criado");
        setLoadingCroqui(false);
        return;
      }

      // Semana mais recente
      const semanaMax = Math.max(...plantiosEstufa.map(p => p.semana || 0));
      const plantiosUltimos = plantiosEstufa.filter(p => p.semana === semanaMax);
      const dataRef = plantiosUltimos[0]?.data_plantio || moment().format("YYYY-MM-DD");
      setUltimaDataPlantio(dataRef);

      // Agrupar por vão
      const porVao = {};
      for (const p of plantiosUltimos) {
        if (!porVao[p.vao]) porVao[p.vao] = { ladoA: {}, ladoB: {} };
        const ladoKey = p.lado === "A" ? "ladoA" : "ladoB";
        const cantIdx = (p.canteiro || 1) - 1;
        if (!porVao[p.vao][ladoKey][cantIdx]) porVao[p.vao][ladoKey][cantIdx] = [];
        porVao[p.vao][ladoKey][cantIdx].push({ variedade: p.variedade || "", quantidade: String(p.quantidade || "") });
      }

      const novosVaos = Object.entries(porVao).map(([vaoNum, lados]) => {
        const montarLado = (ladoData) => ({
          canteiros: [0, 1, 2, 3].map(i =>
            ladoData[i] && ladoData[i].length > 0 ? ladoData[i] : [{ ...EMPTY_VARIEDADE }]
          ),
        });
        return {
          vaoNum: parseInt(vaoNum),
          data: dataRef,
          ladoA: montarLado(lados.ladoA),
          ladoB: montarLado(lados.ladoB),
        };
      }).sort((a, b) => a.vaoNum - b.vaoNum);

      setVaos(novosVaos.length > 0 ? novosVaos : [emptyVao()]);
      setStep("edit");
      toast.success(`Template da Semana ${semanaMax}/${moment(dataRef).year()} carregado`);
    } catch (e) {
      console.error("carregarCroqui error:", e);
      toast.error("Erro ao carregar croqui");
    }
    setLoadingCroqui(false);
  }

  function handleCroquiEmBranco() {
    setCanteirosOcupados([]);
    setUltimaDataPlantio(null);
    setVaos([emptyVao()]);
    setStep("edit");
  }

  function addVao() {
    setVaos(prev => [...prev, emptyVao()]);
  }

  function removeVao(idx) {
    setVaos(prev => prev.filter((_, i) => i !== idx));
  }

  function updateVao(idx, vaoData) {
    setVaos(prev => prev.map((v, i) => i === idx ? vaoData : v));
  }

  // Detecta conflitos: canteiros ocupados que serão sobrescritos
  function detectarConflitos() {
    const conflitos = [];
    for (const vao of vaos) {
      if (!vao.vaoNum) continue;
      for (const [ladoLetra] of [["A"], ["B"]]) {
        for (let cantNum = 1; cantNum <= 4; cantNum++) {
          const cantOcup = canteirosOcupados.find(
            c => c.vao === vao.vaoNum && c.lado === ladoLetra && c.numero === cantNum
          );
          if (cantOcup) {
            conflitos.push(cantOcup);
          }
        }
      }
    }
    return conflitos;
  }

  // Fechar um canteiro específico (finalizar ciclo)
  async function fecharCanteiro(canteiro) {
    try {
      const colheitas = await import("@/api/supabaseClient").then(m => m.colheitasAPI.list());
      const descartes = await import("@/api/supabaseClient").then(m => m.descartesAPI.list());

      const colheitasCant = Array.isArray(colheitas) ? colheitas.filter(c =>
        c.estufa === canteiro.estufa && c.lado === canteiro.lado &&
        c.vao === canteiro.vao && c.canteiro === canteiro.numero
      ) : [];
      const descartesCant = Array.isArray(descartes) ? descartes.filter(d =>
        d.estufa === canteiro.estufa && d.lado === canteiro.lado &&
        d.vao === canteiro.vao && d.canteiro === canteiro.numero
      ) : [];

      const totalCestos = colheitasCant.reduce((s, c) => s + (c.cestos || 0), 0);
      const totalHastes = colheitasCant.reduce((s, c) => s + ((c.hastes ?? c.pressas) || 0), 0);
      const totalDescartado = descartesCant.reduce((s, d) => s + (d.quantidade || 0), 0);

      const dataPlantio = canteiro.data_plantio_ultimo || canteiro.data_plantio || null;

      await canteirosAPI.update(canteiro.id, {
        variedades: [],
        total_mudas: 0,
        data_finalizacao: moment().format("YYYY-MM-DD"),
        data_plantio_ultimo: dataPlantio,
        data_corte_luz_ultimo: dataPlantio ? moment(dataPlantio).add(25, "days").format("YYYY-MM-DD") : null,
        data_previsao_colheita_ultimo: dataPlantio ? moment(dataPlantio).add(12, "weeks").format("YYYY-MM-DD") : null,
        total_colhido_cestos: totalCestos,
        total_colhido_hastes: totalHastes,
        total_descartado: totalDescartado,
        variedades_ultimo_ciclo: canteiro.variedades || [],
        observacao_finalizacao: "Canteiro encerrado manualmente antes de novo plantio",
      });

      // Remove dos conflitos
      setCanteirosOcupados(prev => prev.filter(c => c.id !== canteiro.id));
      setConflitosDialog(prev => ({
        ...prev,
        conflitos: prev.conflitos.filter(c => c.id !== canteiro.id),
        open: prev.conflitos.filter(c => c.id !== canteiro.id).length > 0,
      }));

      toast.success(`Canteiro C${canteiro.numero} do Vão ${canteiro.vao} fechado`);
    } catch (e) {
      toast.error("Erro ao fechar canteiro: " + e.message);
    }
  }

  // Fechar todos os canteiros de um vão
  async function fecharVao(vaoNum) {
    const canteirosDoVao = canteirosOcupados.filter(c => c.vao === vaoNum);
    for (const c of canteirosDoVao) {
      await fecharCanteiro(c);
    }
    toast.success(`Vão ${vaoNum} fechado completamente`);
  }

  async function handleConfirmar() {
    // Validar campos
    for (const vao of vaos) {
      if (!vao.vaoNum) {
        toast.error("Selecione o número do vão em todos os blocos");
        return;
      }
      for (const ladoKey of ["ladoA", "ladoB"]) {
        for (let i = 0; i < 4; i++) {
          const total = vao[ladoKey].canteiros[i].reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);
          if (total > 2000) {
            toast.error(`Canteiro ${i + 1} do Vão ${vao.vaoNum} ultrapassa 2000 mudas`);
            return;
          }
        }
      }
    }

    const temVariedade = vaos.some(vao =>
      ["ladoA", "ladoB"].some(lado =>
        vao[lado].canteiros.some(cant =>
          cant.some(v => v.variedade.trim() && parseInt(v.quantidade) > 0)
        )
      )
    );
    if (!temVariedade) {
      toast.error("Adicione pelo menos uma variedade com quantidade");
      return;
    }

    // *** BLOQUEIO: verificar conflitos de ciclo ativo ***
    const conflitos = detectarConflitos();
    if (conflitos.length > 0) {
      setConflitosDialog({ open: true, conflitos });
      return; // BLOQUEIA — não salva nada
    }

    // Sem conflitos — salvar
    await salvarPlantio();
  }

  async function salvarPlantio() {
    setSaving(true);
    try {
      const allCanteiros = await canteirosAPI.list();
      const safeCanteiros = Array.isArray(allCanteiros) ? allCanteiros : [];

      for (const vao of vaos) {
        const semana = getWeekNumber(vao.data);

        for (const [ladoKey, ladoLetra] of [["ladoA", "A"], ["ladoB", "B"]]) {
          for (let cantIdx = 0; cantIdx < 4; cantIdx++) {
            const variedadesValidas = vao[ladoKey].canteiros[cantIdx].filter(
              v => v.variedade.trim() && parseInt(v.quantidade) > 0
            );
            if (variedadesValidas.length === 0) continue;

            // Criar registros de plantio
            for (const v of variedadesValidas) {
              await plantiosAPI.create({
                estufa,
                lado: ladoLetra,
                vao: vao.vaoNum,
                canteiro: cantIdx + 1,
                variedade: v.variedade.trim(),
                quantidade: parseInt(v.quantidade),
                data_plantio: vao.data,
                semana,
              });
            }

            // Atualizar canteiro
            const varMap = {};
            variedadesValidas.forEach(v => {
              varMap[v.variedade.trim()] = (varMap[v.variedade.trim()] || 0) + parseInt(v.quantidade);
            });
            const novasVariedades = Object.entries(varMap).map(([nome, quantidade]) => ({ nome, quantidade }));
            const totalMudas = novasVariedades.reduce((s, v) => s + v.quantidade, 0);

            const cantExistente = safeCanteiros.find(
              c => c.estufa === estufa && c.lado === ladoLetra && c.vao === vao.vaoNum && c.numero === cantIdx + 1
            );

            if (cantExistente) {
              await canteirosAPI.update(cantExistente.id, {
                variedades: novasVariedades,
                total_mudas: totalMudas,
                data_plantio_ultimo: vao.data,
                data_finalizacao: null, // novo ciclo — limpa finalização anterior
              });
            } else {
              await canteirosAPI.create({
                estufa,
                lado: ladoLetra,
                vao: vao.vaoNum,
                numero: cantIdx + 1,
                variedades: novasVariedades,
                total_mudas: totalMudas,
                data_plantio_ultimo: vao.data,
              });
            }
          }
        }
      }

      toast.success("Plantio registrado com sucesso!");

      // Imprimir croqui
      const plantiosParaImprimir = [];
      for (const vao of vaos) {
        for (const [ladoKey, ladoLetra] of [["ladoA", "A"], ["ladoB", "B"]]) {
          for (let cantIdx = 0; cantIdx < 4; cantIdx++) {
            const variedadesValidas = vao[ladoKey].canteiros[cantIdx].filter(
              v => v.variedade.trim() && parseInt(v.quantidade) > 0
            );
            for (const v of variedadesValidas) {
              plantiosParaImprimir.push({
                estufa,
                vao: vao.vaoNum,
                lado: ladoLetra,
                canteiro: cantIdx + 1,
                variedade: v.variedade.trim(),
                quantidade: parseInt(v.quantidade),
                data_plantio: vao.data,
              });
            }
          }
        }
      }
      printCroquiFromPlantios(plantiosParaImprimir, vaos[0]?.data, true);

      reset();
      onClose();
      onSaved();
    } catch (e) {
      console.error("confirmar plantio error:", e);
      toast.error("Erro ao salvar: " + (e.message || "tente novamente"));
    }
    setSaving(false);
  }

  const vaosArray = estufa ? getVaosArray(estufa) : [];
  const vaosComCicloAtivo = vaos.filter(v => v.vaoNum && canteirosOcupados.some(c => c.vao === v.vaoNum)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Plantio por Estufa
            </DialogTitle>
          </DialogHeader>

          {/* STEP: Seleção de estufa */}
          {step === "select" && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <div>
                  <p className="font-semibold text-primary">Como funciona</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Selecione a estufa → carregue o último croqui como template ou comece do zero. Canteiros com ciclo ativo precisam ser fechados antes de registrar novo plantio.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Selecione a Estufa</Label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEstufa(n)}
                      className={`rounded-xl border-2 py-5 text-center font-bold text-xl transition-all ${
                        estufa === n
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      EST {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
                <Button
                  variant="outline"
                  onClick={() => { if (estufa) handleCroquiEmBranco(); else toast.error("Selecione uma estufa"); }}
                  disabled={!estufa}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Croqui em Branco
                </Button>
                <Button
                  onClick={() => { if (estufa) handleCarregarCroqui(); else toast.error("Selecione uma estufa"); }}
                  disabled={!estufa || loadingCroqui}
                  className="gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  {loadingCroqui ? "Carregando..." : "Carregar Último Croqui"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Edição do croqui */}
          {step === "edit" && (
            <div className="space-y-4 py-2">
              {ultimaDataPlantio && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Template da Semana {moment(ultimaDataPlantio).isoWeek()}/{moment(ultimaDataPlantio).year()} carregado — edite o que mudou e confirme
                  </span>
                </div>
              )}

              {/* Aviso ciclos ativos — agora é BLOQUEIO */}
              {vaosComCicloAtivo > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {vaosComCicloAtivo} vão(s) com ciclo ativo — plantio bloqueado
                    </p>
                    <p className="mt-0.5 text-red-600">
                      Ao clicar em "Confirmar Plantio", você será solicitado a fechar os ciclos ativos antes de prosseguir.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Estufa {estufa} — {vaos.length} vão(s)
                </span>
                <Button variant="outline" size="sm" onClick={addVao} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Vão
                </Button>
              </div>

              <div className="space-y-4">
                {vaos.map((vao, idx) => (
                  <VaoBlock
                    key={idx}
                    vaoData={vao}
                    index={idx}
                    vaosArray={vaosArray}
                    canteirosOcupados={canteirosOcupados}
                    estufa={estufa}
                    onUpdate={(v) => updateVao(idx, v)}
                    onRemove={() => removeVao(idx)}
                  />
                ))}
              </div>

              <div className="flex gap-3 justify-between pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setStep("select")}>Voltar</Button>
                <Button onClick={handleConfirmar} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Plantio
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de conflito */}
      <ConflitoCicloDialog
        open={conflitosDialog.open}
        conflitos={conflitosDialog.conflitos}
        onFecharCanteiro={fecharCanteiro}
        onFecharVao={fecharVao}
        onCancelar={() => setConflitosDialog({ open: false, conflitos: [] })}
      />
    </>
  );
}
