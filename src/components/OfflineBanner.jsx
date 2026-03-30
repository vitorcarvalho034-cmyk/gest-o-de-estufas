import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { getTotalPending, getQueue, removeFromQueue, ENTITIES } from "@/lib/offlineQueue";
import { toast } from "sonner";
import moment from "moment";

const ENTITY_MAP = {
  Colheita: 'Colheita',
  Descarte: 'Descarte',
  PrevisaoColheita: 'PrevisaoColheita',
};

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(getTotalPending());
  const [syncing, setSyncing] = useState(false);

  const refreshPending = () => setPending(getTotalPending());

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    let synced = 0;
    let failed = 0;
    for (const entityName of ENTITIES) {
      const queue = getQueue(entityName);
      for (const item of queue) {
        const { _offlineId, ...data } = item;
        try {
          await base44.entities[entityName].create(data);
          removeFromQueue(entityName, _offlineId);
          synced++;
        } catch {
          failed++;
        }
      }
    }
    setSyncing(false);
    refreshPending();
    if (synced > 0) toast.success(`✅ ${synced} registro(s) sincronizado(s) com sucesso`);
    if (failed > 0) toast.error(`${failed} registro(s) não puderam ser sincronizados`);
  }, [syncing]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); refreshPending(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Listen for new items added to queue
    window.addEventListener('offline-queue-updated', refreshPending);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', refreshPending);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pending > 0) sync();
  }, [isOnline]);

  if (isOnline && pending === 0) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
      !isOnline ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
    }`}>
      {!isOnline ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : (
        <Wifi className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1">
        {!isOnline
          ? `Sem conexão — ${pending} registro(s) serão salvos quando houver internet`
          : `Sincronizando ${pending} registro(s) pendente(s)...`}
      </span>
      {isOnline && pending > 0 && (
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      )}
    </div>
  );
}