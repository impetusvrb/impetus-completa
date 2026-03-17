/**
<<<<<<< HEAD
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial (Prompt v3)
 * Feito do zero: grid 4 colunas, widgets que exibem dados no próprio grid.
 * Sem links para outros módulos. Layout por cargo.
=======
 * DASHBOARD PRINCIPAL
 * Dashboard Inteligente Dinâmico: layout e widgets gerados pelo backend conforme perfil (cargo, departamento, permissões, hierarquia).
 * Admin continua redirecionado ao Chat.
>>>>>>> 69a0e341ce405218b402fdd9ef91e2bd110c65e3
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
<<<<<<< HEAD
import { CentroComando } from '../features/dashboard';
=======
import { DashboardDinamico } from '../features/dashboard';
>>>>>>> 69a0e341ce405218b402fdd9ef91e2bd110c65e3
import ModuleErrorBoundary from '../components/ModuleErrorBoundary';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
  const role = (user?.role || '').toString().toLowerCase();
  if (role === 'admin') return <Navigate to="/app/chatbot" replace />;

<<<<<<< HEAD
  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      <CentroComando />
=======
  if (user?.role === 'admin') return <Navigate to="/app/chatbot" replace />;
  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      <DashboardDinamico />
>>>>>>> 69a0e341ce405218b402fdd9ef91e2bd110c65e3
    </ModuleErrorBoundary>
  );
}
