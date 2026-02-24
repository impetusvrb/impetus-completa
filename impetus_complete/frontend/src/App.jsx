/**
 * IMPETUS COMUNICA IA - FRONTEND APPLICATION
 * Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial
 * Criadores: Wellington Machado de Freitas & Gustavo Júnior da Silva
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import SetupEmpresa from './pages/SetupEmpresa';
import Dashboard from './pages/Dashboard';
import Proposals from './pages/Proposals';
import ProposalDetail from './pages/ProposalDetail';
import Diagnostic from './pages/Diagnostic';
import AdminUsers from './pages/AdminUsers';
import AdminDepartments from './pages/AdminDepartments';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminSettings from './pages/AdminSettings';
import Operacional from './pages/Operacional';
import { BibliotecaPage } from './features/biblioteca';
import AIChatPage from './features/aiChat/AIChatPage';
import LicenseExpired from './pages/LicenseExpired';
import SubscriptionExpired from './pages/SubscriptionExpired';
import ErrorBoundary from './components/ErrorBoundary';
import Error404 from './pages/Error404';
import Error500 from './pages/Error500';
import ErrorOffline from './pages/ErrorOffline';
import './styles.css';

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

export default function App() {
  return (
    <NotificationProvider>
      <ErrorOffline />
      <ErrorBoundary>
        <BrowserRouter>
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
        
        <Route path="/app/configuracoes" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminSettings /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        
        <Route path="/proposals" element={
          <PrivateRoute><SetupGuard><Navigate to="/app/proacao" replace /></SetupGuard></PrivateRoute>
        } />
        
        <Route path="/diagnostic" element={
          <PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><Diagnostic /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>
        } />

        <Route path="/app/admin/users" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminUsers /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/departments" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminDepartments /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/admin/audit-logs" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminAuditLogs /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />
        <Route path="/app/settings" element={<PrivateRoute><SetupGuard><CEORouteGuard><ColaboradorRouteGuard><AdminSettings /></ColaboradorRouteGuard></CEORouteGuard></SetupGuard></PrivateRoute>} />

        <Route path="/license-expired" element={<LicenseExpired />} />
        <Route path="/subscription-expired" element={<SubscriptionExpired />} />
        <Route path="/404" element={<Error404 />} />
        <Route path="/500" element={<Error500 />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </NotificationProvider>
  );
}
