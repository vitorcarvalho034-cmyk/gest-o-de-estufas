import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Estufas from './pages/Estufas';
import Plantio from './pages/Plantio';
import Colheita from './pages/Colheita';
import Descarte from './pages/Descarte';
import PrevisaoColheita from './pages/PrevisaoColheita';
import Produtividade from './pages/Produtividade';
import Historico from './pages/Historico';
import GerenciarCiclos from './pages/GerenciarCiclos';
import Pautas from './pages/Pautas';
import ColhidoRecebido from './pages/ColhidoRecebido';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Desabilitado temporariamente para rodar localmente sem Base44 backend
  /*
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }
  */

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estufas" element={<Estufas />} />
        <Route path="/plantio" element={<Plantio />} />
        <Route path="/colheita" element={<Colheita />} />
        <Route path="/descarte" element={<Descarte />} />
        <Route path="/previsao" element={<PrevisaoColheita />} />
        <Route path="/produtividade" element={<Produtividade />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/ciclos" element={<GerenciarCiclos />} />
        <Route path="/pautas" element={<Pautas />} />
        <Route path="/colhido-recebido" element={<ColhidoRecebido />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App