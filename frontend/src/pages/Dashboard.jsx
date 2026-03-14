/**
 * DASHBOARD PRINCIPAL
 * CEO → ExecutiveDashboard | Admin (Diretor) → AdminDashboard | Manutenção/Demais → DashboardMecanico (com base DashboardInteligente)
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminDashboard, DashboardMecanico, ExecutiveDashboard } from '../features/dashboard';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'admin') return <Navigate to="/app/chatbot" replace />;
  if (user?.role === 'ceo') {
    return <ModuleErrorBoundary moduleName="Visão Executiva"><ExecutiveDashboard /></ModuleErrorBoundary>;
  }
  if ((user?.hierarchy_level ?? 5) <= 1) {
    return <ModuleErrorBoundary moduleName="Dashboard Admin"><AdminDashboard /></ModuleErrorBoundary>;
  }
  return <ModuleErrorBoundary moduleName="Dashboard"><DashboardMecanico /></ModuleErrorBoundary>;
}
