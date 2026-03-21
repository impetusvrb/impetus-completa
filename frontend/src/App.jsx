/**
 * IMPETUS COMUNICA IA - FRONTEND APPLICATION
 * Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial
 * Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
 *
 * Rotas com lazy loading para desempenho e Indústria 4.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import ErrorOffline from './pages/ErrorOffline';
import './styles.css';
import ImpetusVoiceProvider from './voice/ImpetusVoiceProvider';

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
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
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
const OperationalIntelligencePanel = lazy(() => import('./pages/OperationalIntelligencePanel'));
const IndustrialOperationsCenter = lazy(() => import('./pages/IndustrialOperationsCenter'));
const RoleVerificationPage = lazy(() => import('./pages/RoleVerificationPage'));
const OrganizationalValidationPanel = lazy(() => import('./pages/OrganizationalValidationPanel'));
const AppMobile = lazy(() => import('./pages/AppMobile'));
const CadastrarComIA = lazy(() => import('./pages/CadastrarComIA'));
const CentroCustosAdmin = lazy(() => import('./pages/CentroCustosAdmin'));
const AdminAudioLogs = lazy(() => import('./pages/AdminAudioLogs'));
const AdminIntegrations = lazy(() => import('./pages/AdminIntegrations'));
const ManuIA = lazy(() => import('./pages/ManuIA'));
const CentroPrevisaoOperacional = lazy(() => import('./pages/CentroPrevisaoOperacional'));
const CentroCustosExecutivo = lazy(() => import('./pages/CentroCustosExecutivo'));
const MapaVazamentoFinanceiro = lazy(() => import('./pages/MapaVazamentoFinanceiro'));
const AlmoxarifadoInteligente = lazy(() => import('./pages/AlmoxarifadoInteligente'));
const LogisticaInteligente = lazy(() => import('./pages/LogisticaInteligente'));

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

function RoleGuard({ children, allowedRoles }) {
  const role = getUserRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Padrão pós-login: liderança entra no Dashboard (/app). Colaborador segue fluxo operacional.
    const defaults = { admin: '/app/chatbot', ceo: '/app', diretor: '/app', gerente: '/app', coordenador: '/app', supervisor: '/app', colaborador: '/app', auxiliar_producao: '/app', auxiliar: '/app', operador: '/app' };
    return <Navigate to={defaults[role] || '/app/operacional'} replace />;
  }
  return children;
}

// Colaborador / Auxiliar de produção — acessa painel operacional (operador tem dashboard próprio)
function isColaborador() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const role = (user.role || '').toString().toLowerCase();
    return ['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role);
  } catch {
    return false;
  }
}

// Colaborador acessa /app (DashboardColaborador). Rotas restritas redirecionam para /app.
function ColaboradorRouteGuard({ children }) {
  if (!isColaborador()) return children;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path === '/app' || path === '/app/') return children;
  return <Navigate to="/app" replace />;
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
  const allowed = ['/app', '/app/chatbot', '/app/registro-inteligente'];
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
              {isStrictAdmin() ? <Navigate to="/app/chatbot" replace /> : (
                <ColaboradorRouteGuard>
                  <Dashboard />
                </ColaboradorRouteGuard>
              )}
            </SetupGuard>
          </PrivateRoute>
        } />
        <Route path="/app/ceo" element={
          <PrivateRoute><SetupGuard>{isCEO() ? <Dashboard /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/operacional" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Operacional /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/registro-inteligente" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><RegistroInteligente /></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/cadastrar-com-ia" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><CadastrarComIA /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/biblioteca" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><BibliotecaPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/chatbot" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AIChatPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/insights" element={
          <PrivateRoute><SetupGuard><RoleGuard allowedRoles={['diretor','gerente','coordenador']}><InsightsPage /></RoleGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/cerebro-operacional" element={
          <PrivateRoute><SetupGuard><RoleGuard allowedRoles={['diretor','gerente','coordenador','supervisor']}><OperationalIntelligencePanel /></RoleGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/centro-operacoes-industrial" element={
          <PrivateRoute><SetupGuard><RoleGuard allowedRoles={['admin','diretor','gerente','coordenador','supervisor']}><IndustrialOperationsCenter /></RoleGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/monitored-points" element={
          <PrivateRoute><SetupGuard><RoleGuard allowedRoles={['diretor','gerente','coordenador']}><InsightsPage /></RoleGuard></SetupGuard></PrivateRoute>
        } />

        <Route path="/app/manutencao/manuia" element={
          <PrivateRoute><SetupGuard><ManuIA /></SetupGuard></PrivateRoute>
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
        <Route path="/app/almoxarifado-inteligente" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AlmoxarifadoInteligente /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/logistica-inteligente" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><LogisticaInteligente /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/configuracoes" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminSettings /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        
        <Route path="/proposals" element={
          <PrivateRoute><SetupGuard><Navigate to="/app/proacao" replace /></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/diagnostic" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Diagnostic /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />

        <Route path="/app/admin/users" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminUsers /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/departments" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminDepartments /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/structural" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminStructural /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/audit-logs" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><StrictAdminRouteGuard><AdminAuditLogs /></StrictAdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/centro-custos" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><CentroCustosAdmin /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/audio-logs" element={<PrivateRoute><SetupGuard><DirectorOrCEORouteGuard><AdminAudioLogs /></DirectorOrCEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/integrations" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminIntegrations /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/validacao-organizacional" element={<PrivateRoute><SetupGuard><RoleGuard allowedRoles={['admin','diretor','gerente','ceo']}><OrganizationalValidationPanel /></RoleGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/settings" element={<PrivateRoute><SetupGuard><AdminSettings /></SetupGuard></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
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
