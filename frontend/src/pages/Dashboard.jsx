/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial
 * Operador: DashboardOperador (métricas produtividade, máquinas, OEE — sem financeiro)
 * Manutenção: DashboardMecanico | Demais: CentroComando
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { CentroComando, DashboardMecanico, DashboardOperador } from '../features/dashboard';
import { isMaintenanceProfile } from '../utils/roleUtils';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

function isOperadorProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  return role === 'operador' || profile === 'operator_floor';
}

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

  const useOperadorDashboard = isOperadorProfile(user);
  const useMaintenanceDashboard = isMaintenanceProfile(user);

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      {useOperadorDashboard && <DashboardOperador />}
      {!useOperadorDashboard && useMaintenanceDashboard && <DashboardMecanico />}
      {!useOperadorDashboard && !useMaintenanceDashboard && <CentroComando />}
    </ModuleErrorBoundary>
  );
}
