import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CanteiroDialog({ canteiro, open, onClose, onSaved }) {
  const [variedades, setVariedades] = useState(canteiro?.variedades || []);
  const [saving, setSaving] = useState(false);

  const total = variedades.reduce((s, v) => s + (parseInt(v.quantidade) || 0), 0);

  function addVariedade() {
    if (variedades.length >= 4) {
      toast.error("Máximo 4 variedades por canteiro");
      return;
    }
    setVariedades([...variedades, { nome: "", quantidade: 0 }]);
  }

  function removeVariedade(index) {
    setVariedades(variedades.filter((_, i) => i !== index));
  }

  function updateVariedade(index, field, value) {
    const updated = [...variedades];
    updated[index] = { ...updated[index], [field]: field === "quantidade" ? parseInt(value) || 0 : value };
    setVariedades(updated);
  }

  async function save() {
    if (total > 2000) {
      toast.error("Total não pode ultrapassar 2000 mudas");
      return;
    }
    const filtered = variedades.filter((v) => v.nome.trim() !== "");
    setSaving(true);
    await base44.entities.Canteiro.update(canteiro.id, {
      variedades: filtered,
      total_mudas: filtered.reduce((s, v) => s + (v.quantidade || 0), 0),
    });
    toast.success("Canteiro atualizado");
    setSaving(false);
    onSaved();
    onClose();
  }

  if (!canteiro) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Estufa {canteiro.estufa} — Lado {canteiro.lado} — Vão {canteiro.vao} — Canteiro {canteiro.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Variedades</Label>
            <span className={`text-sm font-semibold ${total > 2000 ? "text-destructive" : "text-primary"}`}>
              {total}/2000 mudas
            </span>
          </div>

          <div className="space-y-3">
            {variedades.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="Variedade"
                  value={v.nome}
                  onChange={(e) => updateVariedade(i, "nome", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={v.quantidade || ""}
                  onChange={(e) => updateVariedade(i, "quantidade", e.target.value)}
                  className="w-24"
                  min={0}
                  max={2000}
                />
                <Button variant="ghost" size="icon" onClick={() => removeVariedade(i)} className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addVariedade} disabled={variedades.length >= 4} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Adicionar Variedade
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || total > 2000}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}