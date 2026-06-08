import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Database, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { AppLayout } from './components/AppLayout.jsx';
import { BrandLogo } from './components/BrandLogo.jsx';
import { ToastHost } from './components/ToastHost.jsx';
import { views } from './config/navigation.jsx';
import { BarreirosPage } from './features/barreiros/BarreirosPage.jsx';
import { Dashboard } from './features/dashboard/Dashboard.jsx';
import { ClientesPage } from './features/clientes/ClientesPage.jsx';
import { EquipamentosPage } from './features/equipamentos/EquipamentosPage.jsx';
import { FichaPage } from './features/ficha/FichaPage.jsx';
import { FuncionariosPage } from './features/funcionarios/FuncionariosPage.jsx';
import { HoursReport } from './features/hours/HoursReport.jsx';
import { MateriaisPage } from './features/materiais/MateriaisPage.jsx';
import { OrcamentosPage } from './features/orcamentos/OrcamentosPage.jsx';
import { RelatoriosPage } from './features/relatorios/RelatoriosPage.jsx';
import { clearSession, isSupabaseConfigured, loadCoreData, loginWithPassword, logout, restoreSession } from './lib/supabase.js';
import './styles/app.css';

const ACTIVE_VIEW_KEY = 'binhotti-active-view';

function isValidView(viewId) {
  return views.some((view) => view.id === viewId);
}

function restoreActiveView() {
  try {
    const saved = localStorage.getItem(ACTIVE_VIEW_KEY);
    return isValidView(saved) ? saved : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function saveActiveView(viewId) {
  try {
    localStorage.setItem(ACTIVE_VIEW_KEY, viewId);
  } catch {
    // Navigation persistence is only a convenience.
  }
}

function LoginScreen({ onLogin, message }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(message || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(message || '');
  }, [message]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!isSupabaseConfigured()) {
      setError('Supabase não configurado. Confira o arquivo .env antes de entrar.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha para entrar.');
      return;
    }
    setLoading(true);
    try {
      const session = await loginWithPassword(email.trim(), password);
      onLogin(session);
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-block">
          <BrandLogo />
        </div>
        <div className="login-copy">
          <h1>Acesso ao sistema</h1>
          <p>Entre com o usuário autorizado para acessar a gestão da Binhotti.</p>
        </div>
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          Senha
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        <p className="login-footnote">Simplo Gestão · acesso protegido</p>
      </form>
    </main>
  );
}

function PendingView({ title }) {
  return (
    <section className="panel empty-panel">
      <Database size={28} />
      <h2>{title}</h2>
      <p>Esta tela será copiada do HTML legado mantendo visual e lógica, mas em arquivos separados.</p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="panel loading-panel">
      <div className="loading-mark">
        <Loader2 size={24} />
      </div>
      <h2>Carregando dados</h2>
      <p>Buscando fichas, clientes, frota e relatórios da Binhotti.</p>
      <div className="loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ErrorState({ message, onRetry, loading }) {
  return (
    <section className="panel empty-panel error-panel">
      <h2>Não foi possível carregar</h2>
      <p>{message}</p>
      <button className="ghost-button" type="button" onClick={onRetry} disabled={loading}>
        {loading ? <Loader2 size={15} /> : <RefreshCw size={15} />}
        {loading ? 'Tentando...' : 'Tentar novamente'}
      </button>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(() => restoreSession());
  const [loginMessage, setLoginMessage] = useState('');
  const [activeView, setActiveViewState] = useState(() => restoreActiveView());
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  function setActiveView(viewId) {
    const nextView = isValidView(viewId) ? viewId : 'dashboard';
    setActiveViewState(nextView);
    saveActiveView(nextView);
  }

  useEffect(() => {
    if (!session) return;
    reloadData();
  }, [session]);

  async function reloadData() {
    setLoadingData(true);
    setError('');
    try {
      const nextData = await loadCoreData();
      setData(nextData);
    } catch (err) {
      if (/sessão expirada|jwt expired/i.test(err.message || '')) {
        clearSession();
        setData(null);
        setError('');
        setSession(null);
        setLoginMessage('Sua sessão expirou. Entre novamente para continuar.');
        return;
      }
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoadingData(false);
    }
  }

  const active = useMemo(() => views.find((view) => view.id === activeView) || views[0], [activeView]);
  const hasData = Boolean(data);
  const isInitialLoading = loadingData && !hasData;

  function handleLogin(nextSession) {
    setData(null);
    setError('');
    setLoginMessage('');
    setSession(nextSession);
  }

  if (!session) return <><LoginScreen onLogin={handleLogin} message={loginMessage} /><ToastHost /></>;
  const currentData = data || {};

  function handleLogout() {
    logout();
    setData(null);
    setError('');
    setLoginMessage('');
    setSession(null);
  }

  let content = null;
  if (isInitialLoading) content = <LoadingState />;
  else if (error && !hasData) content = <ErrorState message={error} onRetry={reloadData} loading={loadingData} />;
  else if (activeView === 'dashboard') content = <Dashboard data={currentData} />;
  else if (activeView === 'ficha') content = <FichaPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'clientes') content = <ClientesPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'equipamentos') content = <EquipamentosPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'funcionarios') content = <FuncionariosPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'materiais') content = <MateriaisPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'barreiros') content = <BarreirosPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'orcamentos') content = <OrcamentosPage data={currentData} onReload={reloadData} />;
  else if (activeView === 'relatorios') content = <RelatoriosPage data={currentData} />;
  else if (activeView === 'horas') content = <HoursReport data={currentData} />;
  else content = <PendingView title={active.label} />;

  return (
    <>
      <AppLayout
        views={views}
        activeView={activeView}
        onChangeView={setActiveView}
        title={active.label}
        user={session.user}
        refreshing={loadingData && hasData}
        actions={(
          <div className="topbar-actions">
            {loadingData && hasData ? <span className="sync-pill"><Loader2 size={14} /> Atualizando</span> : null}
            {error && hasData ? <span className="sync-pill error">Falha ao atualizar</span> : null}
            {error && hasData ? (
              <button className="ghost-button" type="button" onClick={reloadData} disabled={loadingData}>
                <RefreshCw size={16} /> <span>Tentar novamente</span>
              </button>
            ) : null}
            <button className="ghost-button" onClick={handleLogout}><LogOut size={16} /> <span>Sair</span></button>
          </div>
        )}
      >
        {content}
      </AppLayout>
      <ToastHost />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
