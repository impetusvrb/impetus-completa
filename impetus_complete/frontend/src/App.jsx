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

// Tela inicial — carregamento imediato
import Login from './pages/Login';

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
const Operacional = lazy(() => import('./pages/Operacional'));
const BibliotecaPage = lazy(() => import('./features/biblioteca').then((m) => ({ default: m.BibliotecaPage })));
const AIChatPage = lazy(() => import('./features/aiChat/AIChatPage'));
const LicenseExpired = lazy(() => import('./pages/LicenseExpired'));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired'));
const Error404 = lazy(() => import('./pages/Error404'));
const Error500 = lazy(() => import('./pages/Error500'));
const ChatPage = lazy(() => import('./chat-module/ChatPage'));

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

// Colaborador só pode acessar Pró-Ação
function isColaborador() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return user.role === 'colaborador';
  } catch {
    return false;
  }
}

// Redireciona colaborador para Pró-Ação ao tentar acessar rotas restritas
function ColaboradorRouteGuard({ children }) {
  if (!isColaborador()) return children;
  return <Navigate to="/app/proacao" replace />;
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
  return <Navigate to="/app" replace />;
}

// Administrador (hierarchy 0 ou 1): CEO ou Diretor — única função que pode cadastrar documentos
function isAdministrador() {
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return (user.hierarchy_level ?? 5) <= 1;
  } catch {
    return false;
  }
}
function AdminRouteGuard({ children }) {
  if (isAdministrador()) return children;
  return <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <NotificationProvider>
      <ErrorOffline />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/setup-empresa" element={
          <PrivateRoute>
            <SetupEmpresa />
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
              <ColaboradorRouteGuard>
                <Dashboard />
              </ColaboradorRouteGuard>
            </SetupGuard>
          </PrivateRoute>
        } />
        <Route path="/app/ceo" element={
          <PrivateRoute><SetupGuard>{isCEO() ? <Dashboard /> : <Navigate to="/app" replace />}</SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/operacional" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Operacional /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        <Route path="/app/biblioteca" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><BibliotecaPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/chatbot" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AIChatPage /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/insights" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Dashboard /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/app/monitored-points" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Dashboard /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
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
        <Route path="/app/admin/audit-logs" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminAuditLogs /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/settings" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminRouteGuard><AdminSettings /></AdminRouteGuard></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />

        <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/license-expired" element={<LicenseExpired />} />
        <Route path="/subscription-expired" element={<SubscriptionExpired />} />
        <Route path="/404" element={<Error404 />} />
        <Route path="/500" element={<Error500 />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </NotificationProvider>
  );
}
