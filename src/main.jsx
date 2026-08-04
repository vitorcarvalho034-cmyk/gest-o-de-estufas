import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Detecta nova versão automaticamente: a cada 2 minutos verifica se o index.html mudou.
// Se mudou (novo deploy), recarrega a página silenciosamente para o usuário ter sempre a versão mais recente.
(function checkForUpdates() {
  let lastEtag = null;

  async function check() {
    try {
      const res = await fetch('/index.html', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const etag = res.headers.get('etag') || res.headers.get('last-modified');
      if (lastEtag === null) {
        lastEtag = etag;
      } else if (etag && etag !== lastEtag) {
        // Nova versão detectada — recarrega
        window.location.reload();
      }
    } catch {
      // Sem conexão, ignora
    }
  }

  // Verifica a cada 2 minutos
  setInterval(check, 2 * 60 * 1000);

  // Também verifica quando o app volta ao foco (usuário volta para a aba/app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
