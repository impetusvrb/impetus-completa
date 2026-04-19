/**
 * IMPETUS COMUNICA IA - FRONTEND APPLICATION
 * Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial
 * Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
 *
 * Rotas com lazy loading para desempenho e Indústria 4.0
 */

import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import ErrorOffline from './pages/ErrorOffline';
import './styles.css';
import ImpetusVoiceProvider from './voice/ImpetusVoiceProvider';
import { isColaboradorSimples, isMaintenanceTechnicianMenu, canAccessPulseRhRoute } from './utils/roleUtils';
import { factoryTeam } from './services/api';
import './components/FactoryTeamOperatorBar.css';

// Tela inicial — carregamento imediato
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Rotas carregadas sob demanda (lazy loading)
const SetupEmpresa = lazy(() => import('./pages/SetupEmpresa'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Proposals = lazy(() => import('./pages/Proposals'));
const ProposalDetail = lazy(() => import('./pages/ProposalDetail'));
const Diagnostic = lazy(() => import('./pages/Diagnostic'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminDepartments = lazy(() => import('./pages/AdminDepartments'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const CompanyAdminSettings = lazy(() => import('./pages/CompanyAdminSettings'));
const AdminStructural = lazy(() => import('./pages/AdminStructural'));
const RegistroInteligente = lazy(() => import('./pages/RegistroInteligente'));
const Operacional = lazy(() => import('./pages/Operacional'));
const BibliotecaPage = lazy(() => import('./features/biblioteca').then((m) => ({ default: m.BibliotecaPage })));
const AIChatPage = lazy(() => import('./features/aiChat/AIChatPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const LicenseExpired = lazy(() => import('./pages/LicenseExpired'));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired'));
const Error404 = lazy(() => import('./pages/Error404'));
const Error500 = lazy(() => import('./pages/Error500'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const PulseRh = lazy(() => import('./pages/PulseRh'));
const PulseGestao = lazy(() => import('./pages/PulseGestao'));
const OperationalIntelligencePanel = lazy(() => import('./pages/OperationalIntelligencePanel'));
const IndustrialOperationsCenter = lazy(() => import('./pages/IndustrialOperationsCenter'));
const RoleVerificationPage = lazy(() => import('./pages/RoleVerificationPage'));
const OrganizationalValidationPanel = lazy(() => import('./pages/OrganizationalValidationPanel'));
const AppMobile = lazy(() => import('./pages/AppMobile'));
const CadastrarComIA = lazy(() => import('./pages/CadastrarComIA'));
const CentroCustosAdmin = lazy(() => import('./pages/CentroCustosAdmin'));
const ImplementationGuide = lazy(() => import('./pages/ImplementationGuide'));
const AdminAudioLogs = lazy(() => import('./pages/AdminAudioLogs'));
const AdminIntegrations = lazy(() => import('./pages/AdminIntegrations'));
const NexusIACustos = lazy(() => import('./pages/NexusIACustos'));
const AdminEquipmentLibrary = lazy(() => import('./pages/AdminEquipmentLibrary'));
const ManuIA = lazy(() => import('./pages/ManuIA'));
const ManuIAExtensionApp = lazy(() => import('./manuia-app/ManuIAExtensionApp'));
const CentroPrevisaoOperacional = lazy(() => import('./pages/CentroPrevisaoOperacional'));
const CentroCustosExecutivo = lazy(() => import('./pages/CentroCustosExecutivo'));
const MapaVazamentoFinanceiro = lazy(() => import('./pages/MapaVazamentoFinanceiro'));
const SelectTeamMember = lazy(() => import('./pages/SelectTeamMember'));
const AdminOperationalTeams = lazy(() => import('./pages/AdminOperationalTeams'));
const AdminHelpCenter = lazy(() => import('./pages/AdminHelpCenter'));
function needSetup() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return u.is_first_access || (!u.company_id && u.role !== 'internal_admin');
  } catch {
    return false;
  }
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('impetus_token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function SetupGuard({ children }) {
  if (needSetup()) return <Navigate to="/setup-empresa" replace />;
  return children;
}

function getUserRole() {
  try { return (JSON.parse(localStorage.getItem('impetus_user') || '{}').role || 'colaborador').toLowerCase(); } catch { return 'colaborador'; }
}

function canAccessIndustrialCore() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const role = String(user.role || '').toLowerCase();
    if (role === 'ceo') return true;
    if (role !== 'diretor') return false;

    const profile = String(user.dashboard_profile || '').toLowerCase();
    const area = String(user.functional_area || user.area || '').toLowerCase();
    return (
      profile === 'director_industrial' ||
      profile === 'director_operations' ||
      area.includes('industrial') ||
      area.includes('operations') ||
      area.includes('operacoes')
    );
  } catch {
    return false;
  }
}

function PulseRhRouteGuard({ children }) {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    if (canAccessPulseRhRoute(user)) return children;
  } catch {
    /* ignore */
  }
  return <Navigate to="/app" replace />;
}

function RoleGuard({ children, allowedRoles }) {
  const role = getUserRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Padrão pós-login: liderança entra no Dashboard (/app). Colaborador segue fluxo operacional.
    const defaults = { admin: '/app/admin/implantacao-guia', ceo: '/app', diretor: '/app', gerente: '/app', coordenador: '/app', supervisor: '/app', colaborador: '/app', auxiliar_producao: '/app', auxiliar: '/app', operador: '/app' };
    return <Navigate to={defaults[role] || '/app'} replace />;
  }
  return children;
}

function isColaborador() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const role = (user.role || '').toString().toLowerCase();
    return ['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role);
  } catch {
    return false;
  }
}

/** Rotas permitidas para colaborador: simples (mínimo) vs técnico de manutenção */
function ColaboradorRouteGuard({ children }) {
  if (!isColaborador()) return children;
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const raw = typeof window !== 'undefined' ? window.location.pathname : '';
    const path = raw.replace(/\/+$/, '') || '/';

    if (isColaboradorSimples(user)) {
      const allowOp = [
        '/app',
        '/app/equipe-operacional',
        '/app/proacao',
        '/app/cadastrar-com-ia',
        '/app/biblioteca',
        '/app/registro-inteligente',
        '/app/chatbot',
        '/chat',
        '/app/settings'
      ];
      const ok = allowOp.includes(path) || path.startsWith('/app/proacao/');
      if (!ok) return <Navigate to="/app" replace />;
      return children;
    }

    if (isMaintenanceTechnicianMenu(user)) {
      const allow = ['/app', '/app/equipe-operacional', '/app/proacao', '/app/cadastrar-com-ia', '/app/registro-inteligente', '/app/chatbot', '/chat', '/diagnostic', '/app/manutencao/manuia', '/app/manutencao/manuia-app', '/app/biblioteca', '/app/settings'];
      const ok = allow.includes(path) || path.startsWith('/app/proacao/');
      if (!ok) return <Navigate to="/app" replace />;
      return children;
    }
  } catch {
    /* fallthrough */
  }
  return children;
}

const FACTORY_OPERATOR_GATE_KEY = 'impetus_factory_operator_gate';

/** Contas de equipe (login coletivo): verificação secundária + membro ativo na sessão */
function FactoryTeamMemberGate({ children }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      return !u.is_factory_team_account;
    } catch {
      return true;
    }
  });
  const [gateError, setGateError] = useState(null);

  const runCheck = useCallback(async () => {
    let u;
    try {
      u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    } catch {
      u = {};
    }
    if (!u.is_factory_team_account) {
      setReady(true);
      setGateError(null);
      return;
    }
    setGateError(null);
    setReady(false);
    try {
      try {
        if (!sessionStorage.getItem(FACTORY_OPERATOR_GATE_KEY)) {
          await factoryTeam.clearActiveMember();
        }
      } catch (_) {
        /* segue para contexto */
      }
      const r = await factoryTeam.getContext();
      if (r.data?.needs_selection || !sessionStorage.getItem(FACTORY_OPERATOR_GATE_KEY)) {
        navigate('/app/equipe-operacional', { replace: true });
        return;
      }
      setReady(true);
    } catch (e) {
      setGateError(e.apiMessage || e.response?.data?.error || 'Não foi possível validar a sessão da equipe');
    }
  }, [navigate]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (gateError) {
    return (
      <div className="factory-gate-error">
        <p>{gateError}</p>
        <button type="button" className="btn btn-primary" onClick={() => runCheck()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!ready) return <PageLoader />;
  return children;
}

function DashboardRouteEntry() {
  return (
    <ColaboradorRouteGuard>
      <FactoryTeamMemberGate>
        <Dashboard />
      </FactoryTeamMemberGate>
    </ColaboradorRouteGuard>
  );
}

function SettingsAccessGuard({ children }) {
  return children;
}

// CEO só acessa /app (Visão Executiva) — bloqueia admin, settings, operacional, etc.
function isCEO() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return user.role === 'ceo';
  } catch {
    return false;
  }
}
function CEORouteGuard({ children }) {
  if (!isCEO()) return children;
  const allowed = ['/app', '/app/chatbot', '/app/registro-inteligente', '/app/cadastrar-com-ia'];
  if (allowed.some(p => window.location.pathname.startsWith(p))) return children;
  return <Navigate to="/app" replace />;
}

// Administrador (hierarchy 0 ou 1): CEO ou Diretor — única função que pode cadastrar documentos
function isAdministrador() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return (user.hierarchy_level ?? 5) <= 1 || ['admin','diretor','gerente','coordenador'].includes(user.role);
  } catch {
    return false;
  }
}
function AdminRouteGuard({ children }) {
  if (isAdministrador()) return children;
  return <Navigate to="/app" replace />;
}

function isStrictAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return (user.role || '').toString().toLowerCase() === 'admin';
  } catch {
    return false;
  }
}
function StrictAdminRouteGuard({ children }) {
  if (isStrictAdmin()) return children;
  return <Navigate to="/app" replace />;
}

// Logs de Áudio: acesso exclusivo CEO e diretoria (conteúdo sensível)
function isDirectorOrCEO() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return ['ceo', 'admin', 'diretor'].includes(user.role);
  } catch {
    return false;
  }
}
function DirectorOrCEORouteGuard({ children }) {
  if (isDirectorOrCEO()) return children;
  return <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <NotificationProvider>
      <ErrorOffline />
      <ErrorBoundary>
      <BrowserRouter>
          <ImpetusVoiceProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/setup-empresa" element={
          <PrivateRoute>
            <SetupEmpresa />
          </PrivateRoute>
        } />
        <Route path="/validacao-cargo" element={
          <PrivateRoute>
            <RoleVerificationPage />
          </PrivateRoute>
        } />
        
        {/* Rotas protegidas */}
        <Route path="/app/proacao" element={
          <PrivateRoute><SetupGuard><Proposals /></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/proacao/:id" element={
          <PrivateRoute><SetupGuard><ProposalDetail /></SetupGuard></PrivateRoute>
        } />

        <Route path="/app" element={
          <PrivateRoute>
            <SetupGuard>
              {isStrictAdmin() ? <Navigate to="/app/admin/implantacao-guia" replace /> : <DashboardRouteEntry />}
            </SetupGuard>
          </PrivateRoute>
        } />
        <Route path="/app/dashboard-vivo" element={
          <PrivateRoute>
            <SetupGuard>
              {isStrictAdmin() ? <Navigate to="/app/admin/implantacao-guia" replace /> : <Navigate to="/app" replace />}
            </SetupGuard>
          </PrivateRoute>
        } />
        <Route path="/app/ceo" element={
          <PrivateRoute><SetupGuard>{isCEO() ? <Dashboard /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/operacional" element={
          <PrivateRoute><SetupGuard><StrictAdminRouteGuard><Operacional /></StrictAdminRouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/registro-inteligente" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><RegistroInteligente /></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/cadastrar-com-ia" element={
          <PrivateRoute><SetupGuard><ColaboradorRouteGuard><CadastrarComIA /></ColaboradorRouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/biblioteca" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><BibliotecaPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/chatbot" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AIChatPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/insights" element={
          <PrivateRoute><SetupGuard>{canAccessIndustrialCore() ? <InsightsPage /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        <Route path="/app/pulse-rh" element={
          <PrivateRoute><SetupGuard><PulseRhRouteGuard><PulseRh /></PulseRhRouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/pulse-gestao" element={
          <PrivateRoute><SetupGuard><RoleGuard allowedRoles={['diretor','gerente','coordenador','supervisor']}><PulseGestao /></RoleGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/cerebro-operacional" element={
          <PrivateRoute><SetupGuard>{canAccessIndustrialCore() ? <OperationalIntelligencePanel /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        <Route path="/app/centro-operacoes-industrial" element={
          <PrivateRoute><SetupGuard>{canAccessIndustrialCore() ? <IndustrialOperationsCenter /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        <Route path="/app/monitored-points" element={<PrivateRoute><Navigate to="/app" replace /></PrivateRoute>} />
        <Route path="/app/almoxarifado-inteligente" element={<PrivateRoute><Navigate to="/app" replace /></PrivateRoute>} />
        <Route path="/app/logistica-inteligente" element={<PrivateRoute><Navigate to="/app" replace /></PrivateRoute>} />

        <Route path="/app/manutencao/manuia" element={
          <PrivateRoute><SetupGuard><ManuIA /></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/manutencao/manuia-app" element={
          <PrivateRoute><SetupGuard><ManuIAExtensionApp /></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/centro-previsao-operacional" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><CentroPrevisaoOperacional /></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/centro-custos-industriais" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><CentroCustosExecutivo /></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/mapa-vazamento-financeiro" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><MapaVazamentoFinanceiro /></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/configuracoes" element={<Navigate to="/app/admin/conteudo-empresa" replace />} />
        <Route path="/app/admin/conteudo-empresa" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><CompanyAdminSettings /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        
        <Route path="/proposals" element={
          <PrivateRoute><SetupGuard><Navigate to="/app/proacao" replace /></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/diagnostic" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Diagnostic /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />

        <Route path="/app/admin/users" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminUsers /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/implantacao-guia" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><StrictAdminRouteGuard><ImplementationGuide /></StrictAdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/departments" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminDepartments /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/equipes-operacionais" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminOperationalTeams /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/structural" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminStructural /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/audit-logs" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><StrictAdminRouteGuard><AdminAuditLogs /></StrictAdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/equipment-library" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><StrictAdminRouteGuard><AdminEquipmentLibrary /></StrictAdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/centro-custos" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><CentroCustosAdmin /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/audio-logs" element={<PrivateRoute><SetupGuard><DirectorOrCEORouteGuard><AdminAudioLogs /></DirectorOrCEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/integrations" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminIntegrations /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/nexusia-custos" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><NexusIACustos /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/help-center" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminHelpCenter /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/validacao-organizacional" element={<PrivateRoute><SetupGuard><RoleGuard allowedRoles={['internal_admin','diretor','gerente','coordenador','supervisor','ceo']}><OrganizationalValidationPanel /></RoleGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/equipe-operacional" element={<PrivateRoute><SetupGuard><ColaboradorRouteGuard><SelectTeamMember /></ColaboradorRouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/settings" element={<PrivateRoute><SetupGuard><SettingsAccessGuard><UserSettings /></SettingsAccessGuard></SetupGuard></PrivateRoute>} />
        <Route path="/chat" element={
          <PrivateRoute>
            <ColaboradorRouteGuard>
              <ChatPage />
            </ColaboradorRouteGuard>
          </PrivateRoute>
        } />
        <Route path="/m" element={<PrivateRoute><SetupGuard><AppMobile /></SetupGuard></PrivateRoute>} />
        <Route path="/license-expired" element={<LicenseExpired />} />
        <Route path="/subscription-expired" element={<SubscriptionExpired />} />
        <Route path="/404" element={<Error404 />} />
        <Route path="/500" element={<Error500 />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          </Suspense>
          </ImpetusVoiceProvider>
        </BrowserRouter>
        </ErrorBoundary>
    </NotificationProvider>
  );
}
