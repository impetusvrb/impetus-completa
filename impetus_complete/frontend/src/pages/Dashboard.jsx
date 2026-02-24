/**
 * DASHBOARD PRINCIPAL
 * CEO → ExecutiveDashboard | Demais → DashboardInteligente (layout fixo 6 blocos)
 */

import React from 'react';
import { DashboardInteligente, ExecutiveDashboard } from '../features/dashboard';
import './Dashboard.css';

export default function Dashboard() {
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (user?.role === 'ceo') {
    return <ExecutiveDashboard />;
  }
  return <DashboardInteligente />;
}
