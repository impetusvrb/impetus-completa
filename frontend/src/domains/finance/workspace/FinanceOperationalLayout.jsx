import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { canAccessFinanceDomainMenu } from '../navigation/financeAccess.js';
import { readMenuStabilityCache } from '../../../utils/menuStabilityCache.js';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

/**
 * Layout raiz Finance — gate alinhado ao menu (financeAccess + visible_modules em cache).
 * Evita falso negativo pós-FIN-EVOLVE-001A para Diretor Financeiro com financial_intelligence.
 */
export default function FinanceOperationalLayout() {
  const user = readUser();
  const modules = readMenuStabilityCache();
  if (!canAccessFinanceDomainMenu(user, modules)) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}
