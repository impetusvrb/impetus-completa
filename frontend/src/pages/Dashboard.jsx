/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial
 * Operador: DashboardOperador | Colaborador: DashboardColaborador | Manutenção: DashboardMecanico | Liderança/RH: CentroComando
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  CentroComando,
  DashboardColaborador,
  DashboardMecanico,
  DashboardOperador
} from '../features/dashboard';
import { isMaintenanceProfile } from '../utils/roleUtils';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

function isOperadorProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  return role === 'operador' || profile === 'operator_floor';
}

function isColaboradorProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return ['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role);
}

/** Alinha com o motor do servidor: perfis de staff (RH/Finanças) não usam o dashboard de chão genérico. */
const CENTRO_BY_DASHBOARD_PROFILE = new Set(['hr_management', 'finance_management']);
const CENTRO_BY_FUNCTIONAL_AREA = new Set(['hr', 'rh', 'recursos_humanos', 'finance']);

function shouldUseCentroComandoForColaborador(user) {
  if (!user) return false;
  const prof = String(user.dashboard_profile || '').toLowerCase().trim();
  if (CENTRO_BY_DASHBOARD_PROFILE.has(prof)) return true;
  const fa = String(user.functional_area || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (CENTRO_BY_FUNCTIONAL_AREA.has(fa)) return true;
  return false;
}

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

  const useOperadorDashboard = isOperadorProfile(user);
  const useMaintenanceDashboard = isMaintenanceProfile(user);
  const colaboradorRole = isColaboradorProfile(user);
  const useColaboradorDashboard =
    colaboradorRole && !shouldUseCentroComandoForColaborador(user);

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      {useOperadorDashboard && <DashboardOperador />}
      {/** Manutenção antes de colaborador: técnicos de campo usam role colaborador + área manutenção */}
      {!useOperadorDashboard && useMaintenanceDashboard && <DashboardMecanico />}
      {!useOperadorDashboard && !useMaintenanceDashboard && useColaboradorDashboard && <DashboardColaborador />}
      {!useOperadorDashboard && !useMaintenanceDashboard && !useColaboradorDashboard && <CentroComando />}
    </ModuleErrorBoundary>
  );
}
