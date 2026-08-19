import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("pwa-install-dismissed") === "1");

  useEffect(() => {
    if (isStandalone()) return;

    if (isIosDevice()) {
      setShowIosHelp(true);
      return;
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || isStandalone() || (!deferredPrompt && !showIosHelp)) return null;

  return (
    <div className="mx-3 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 shadow-sm lg:hidden">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-emerald-700 p-2 text-white">
          {showIosHelp ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Use como aplicativo</p>
          {showIosHelp ? (
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/80">
              No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/80">
              Instale a Flores da Terra para abrir direto pelo ícone e receber as atualizações corretamente.
            </p>
          )}
          {deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-800"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar aplicativo
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-emerald-900/60 hover:bg-emerald-100 hover:text-emerald-900"
          aria-label="Fechar aviso de instalação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
