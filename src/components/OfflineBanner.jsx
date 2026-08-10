import { useState, useEffect, useRef } from "react";
import { colheitasAPI, descartesAPI, previsaoColheitaAPI } from "@/api/supabaseClient";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { getTotalPending, getQueue, removeFromQueue, ENTITIES } from "@/lib/offlineQueue";
import { toast } from "sonner";

const API_MAP = {
  Colheita: colheitasAPI,
  Descarte: descartesAPI,
  PrevisaoColheita: previsaoColheitaAPI,
};

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getTotalPending());
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPending = () => setPending(getTotalPending());

  async function sync() {
    if (syncingRef.current) return;
    if (!navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    let synced = 0;
    let failed = 0;
    for (const entityName of ENTITIES) {
      const queue = getQueue(entityName);
      const api = API_MAP[entityName];
      if (!api || queue.length === 0) continue;
      for (const item of queue) {
        const { _offlineId, ...data } = item;
        try {
          await api.create(data);
          removeFromQueue(entityName, _offlineId);
          synced++;
        } catch (e) {
          console.warn(`Sync failed for ${entityName}:`, e);
          failed++;
        }
      }
    }
    syncingRef.current = false;
    setSyncing(false);
    refreshPending();
    if (synced > 0) toast.success(`✅ ${synced} registro(s) sincronizado(s) com sucesso`);
    if (failed > 0) toast.error(`${failed} registro(s) não puderam ser sincronizados`);
  }

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshPending();
      setTimeout(() => sync(), 500);
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdated = () => {
      refreshPending();
      if (navigator.onLine) setTimeout(() => sync(), 300);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdated);
    };
  }, []);

  // Auto-sync ao montar se já estiver online com pendentes
  useEffect(() => {
    if (navigator.onLine && getTotalPending() > 0) {
      setTimeout(() => sync(), 1000);
    }
  }, []);

  if (isOnline && pending === 0) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
      !isOnline ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
    }`}>
      {!isOnline ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : (
        <Wifi className="w-4 h-4 shrink-0 animate-pulse" />
      )}
      <span className="flex-1">
        {!isOnline
          ? `Sem conexão — ${pending} registro(s) serão salvos quando houver internet`
          : syncing
            ? `Sincronizando ${pending} registro(s) pendente(s)...`
            : `${pending} registro(s) aguardando sincronização`}
      </span>
      {isOnline && pending > 0 && (
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      )}
    </div>
  );
}
