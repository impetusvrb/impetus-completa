/**
 * DASHBOARD PRINCIPAL — Centro de Comando Industrial
 * Operador: DashboardOperador | Manutenção: DashboardMecanico | Demais perfis (incl. colaborador): CentroComando
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CentroComando,
  DashboardMecanico,
  DashboardOperador
} from '../features/dashboard';
import {
  hasMaintenanceProfileContext,
  isMaintenanceProfile,
  isStrictAdminRole
} from '../utils/roleUtils';
import { mergeUserFromDashboardMe, useVisibleModules } from '../hooks/useVisibleModules';
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
  const role = String(user.role || '').toLowerCase().trim();
  if (['hr_management', 'finance_management', 'director_hr', 'hr_director'].includes(profile)) return true;
  if (role === 'diretor' && (profile.includes('hr') || profile.includes('rh'))) return true;
  const fa = String(user.functional_area || user.area || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return ['hr', 'rh', 'recursos_humanos', 'finance', 'financas'].includes(fa);
}

export default function Dashboard() {
  const { maintenanceFromProfile, dashboardMePayload, loading: modulesLoading } = useVisibleModules();
  const user = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      return mergeUserFromDashboardMe(parsed, dashboardMePayload);
    } catch {
      return mergeUserFromDashboardMe({}, dashboardMePayload);
    }
  }, [dashboardMePayload]);

  const isAdmin = isStrictAdminRole(user);
  const intelligentActivated = useRef(false);
  useEffect(() => {
    if (isAdmin) return;
    if (!intelligentActivated.current) {
      intelligentActivated.current = true;
      console.info('[DASHBOARD_INTELLIGENT_ACTIVATED]');
    }
  }, [isAdmin]);

  if (isAdmin) return <Navigate to="/app/chatbot" replace />;

  const useStaffCentro = isStaffCentroProfile(user);
  const useOperadorDashboard = isOperadorProfile(user);
  const useMaintenanceDashboard = hasMaintenanceProfileContext(user, maintenanceFromProfile);
  const colaboradorRole = isColaboradorProfile(user);

  /** Aguarda /dashboard/me antes de fixar colaborador genérico (localStorage pode vir só com role). */
  const awaitingProfileResolution =
    modulesLoading &&
    colaboradorRole &&
    !useMaintenanceDashboard &&
    !isMaintenanceProfile(user) &&
    !dashboardMePayload;

  if (awaitingProfileResolution) {
    return (
      <ModuleErrorBoundary moduleName="Dashboard">
        <div className="dashboard-mecanico-loading" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
          <div className="dashboard-mecanico-spinner" />
          <p>Carregando dashboard...</p>
        </div>
      </ModuleErrorBoundary>
    );
  }

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
