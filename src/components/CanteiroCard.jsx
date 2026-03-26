import { Sprout } from "lucide-react";

export default function CanteiroCard({ canteiro, onClick }) {
  const totalMudas = canteiro.total_mudas || 0;
  const variedades = canteiro.variedades || [];
  const percentual = Math.round((totalMudas / 2000) * 100);

  return (
    <button
      onClick={() => onClick(canteiro)}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Cant. {canteiro.numero}</span>
        <span className="text-xs text-muted-foreground">{totalMudas}/2000</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>

      {variedades.length > 0 ? (
        <div className="space-y-1.5">
          {variedades.map((v, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Sprout className="w-3 h-3 text-primary/60" />
                <span className="truncate max-w-[100px]">{v.nome}</span>
              </div>
              <span className="text-muted-foreground font-medium">{v.quantidade}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Vazio</p>
      )}
    </button>
  );
}