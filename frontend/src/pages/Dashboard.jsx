/**
 * DASHBOARD PRINCIPAL
 * Dashboard Inteligente Dinâmico: layout e widgets gerados pelo backend conforme perfil (cargo, departamento, permissões, hierarquia).
 * Admin continua redirecionado ao Chat.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardDinamico } from '../features/dashboard';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'admin') return <Navigate to="/app/chatbot" replace />;
  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      <DashboardDinamico />
    </ModuleErrorBoundary>
  );
}
