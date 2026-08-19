import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function PwaUpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const onUpdateAvailable = () => setAvailable(true);
    window.addEventListener("flores-update-available", onUpdateAvailable);
    return () => window.removeEventListener("flores-update-available", onUpdateAvailable);
  }, []);

  if (!available) return null;

  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950 shadow-sm">
      <div className="rounded-lg bg-sky-700 p-2 text-white">
        <RefreshCw className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nova versão disponível</p>
        <p className="mt-0.5 text-xs leading-relaxed text-sky-900/80">
          Atualize quando terminar o lançamento em andamento.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white active:bg-sky-800"
      >
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setAvailable(false)}
        className="rounded p-1 text-sky-900/60 hover:bg-sky-100 hover:text-sky-900"
        aria-label="Fechar aviso de atualização"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
