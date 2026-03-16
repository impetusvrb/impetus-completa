/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial (Prompt v3)
 * Feito do zero: grid 4 colunas, widgets que exibem dados no próprio grid.
 * Sem links para outros módulos. Layout por cargo.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { CentroComando } from '../features/dashboard';
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      <CentroComando />
    </ModuleErrorBoundary>
  );
}
