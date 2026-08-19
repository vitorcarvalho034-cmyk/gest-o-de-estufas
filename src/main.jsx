import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// PWA: procura atualizações sem interromper lançamentos em andamento.
// Quando houver uma versão nova, a interface mostra um aviso e o usuário decide quando atualizar.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        const notifyUpdate = () => {
          window.dispatchEvent(new CustomEvent('flores-update-available'));
        };

        const watchInstallingWorker = () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate();
            }
          });
        };

        if (registration.waiting) notifyUpdate();
        registration.addEventListener('updatefound', watchInstallingWorker);

        const checkForUpdate = () => registration.update().catch(() => undefined);
        checkForUpdate();

        // Verifica em segundo plano sem recarregar a tela. Uma vez a cada 5 minutos é suficiente.
        setInterval(checkForUpdate, 5 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      })
      .catch(() => {
        // Sem suporte a PWA ou falha temporária: o app continua funcionando no navegador.
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
