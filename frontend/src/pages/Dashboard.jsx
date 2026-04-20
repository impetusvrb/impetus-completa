/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial
 * Operador: DashboardOperador | Manutenção: DashboardMecanico | Demais perfis (incl. colaborador): CentroComando
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  CentroComando,
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

/** RH/Financeiro devem usar sempre o Centro de Comando personalizado. */
function isStaffCentroProfile(user) {
  if (!user) return false;
  const profile = String(user.dashboard_profile || '').toLowerCase().trim();
  if (['hr_management', 'finance_management'].includes(profile)) return true;
  const fa = String(user.functional_area || user.area || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return ['hr', 'rh', 'recursos_humanos', 'finance', 'financas'].includes(fa);
}

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

  const useStaffCentro = isStaffCentroProfile(user);
  const useOperadorDashboard = isOperadorProfile(user);
  const useMaintenanceDashboard = isMaintenanceProfile(user);
  const colaboradorRole = isColaboradorProfile(user);

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      {/** RH/Financeiro tem prioridade e usa o CentroComando personalizado. */}
      {useStaffCentro && <CentroComando />}
      {!useStaffCentro && useOperadorDashboard && <DashboardOperador />}
      {/** Manutenção antes de colaborador: técnicos de campo usam role colaborador + área manutenção */}
      {!useStaffCentro && !useOperadorDashboard && useMaintenanceDashboard && <DashboardMecanico />}
      {/** Colaborador também usa CentroComando personalizado (mesmo motor dos demais perfis). */}
      {!useStaffCentro && !useOperadorDashboard && !useMaintenanceDashboard && colaboradorRole && <CentroComando />}
      {!useStaffCentro && !useOperadorDashboard && !useMaintenanceDashboard && !colaboradorRole && <CentroComando />}
    </ModuleErrorBoundary>
  );
}
