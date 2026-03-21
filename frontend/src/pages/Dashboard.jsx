/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial
 * Perfis de manutenção: DashboardMecanico | Demais: CentroComando
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { CentroComando, DashboardMecanico } from '../features/dashboard';
import { isMaintenanceProfile } from '../utils/roleUtils';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

  const useMaintenanceDashboard = isMaintenanceProfile(user);

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      {useMaintenanceDashboard ? <DashboardMecanico /> : <CentroComando />}
    </ModuleErrorBoundary>
  );
}
