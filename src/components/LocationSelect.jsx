import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVaosArray } from "@/lib/estufasConfig";
import { Label } from "@/components/ui/label";

export default function LocationSelect({ estufa, lado, canteiro, onChange, required = true }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Estufa {required && "*"}</Label>
        <Select value={String(estufa || "")} onValueChange={(v) => onChange("estufa", parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Estufa" /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>Estufa {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Lado {required && "*"}</Label>
        <Select value={lado || ""} onValueChange={(v) => onChange("lado", v)}>
          <SelectTrigger><SelectValue placeholder="Lado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Lado A</SelectItem>
            <SelectItem value="B">Lado B</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Vão {required && "*"}</Label>
        <Select value={String(canteiro || "")} onValueChange={(v) => onChange("canteiro", parseInt(v))}>
          <SelectTrigger><SelectValue placeholder="Vão" /></SelectTrigger>
          <SelectContent>
            {getVaosArray(estufa).map((n) => (
              <SelectItem key={n} value={String(n)}>Vão {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}