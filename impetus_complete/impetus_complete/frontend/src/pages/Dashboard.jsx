/**
 * DASHBOARD PRINCIPAL
 * CEO → ExecutiveDashboard | Admin (Diretor) → AdminDashboard | Demais → DashboardInteligente
 */

import React from 'react';
import { AdminDashboard, DashboardInteligente, ExecutiveDashboard } from '../features/dashboard';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'ceo') {
    return <ExecutiveDashboard />;
  }
  if ((user?.hierarchy_level ?? 5) <= 1) {
    return <AdminDashboard />;
  }
  return <DashboardInteligente />;
}
