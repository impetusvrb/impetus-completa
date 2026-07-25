/**
 * REG-001 — Audit API (consultas apenas).
 */
import {
  REG_FUNCTIONAL_RECOVERY_MATRIX,
  REG_ORPHAN_API_CLIENTS,
  listRegressions,
  getFeatureAudit,
  validateRecoveryMatrix
} from './reg001RecoveryMatrix.js';
import { REG_NAVIGATION_AUDIT, listBrokenNavigation, validateNavigationAudit } from './reg001NavigationAudit.js';
import { REG_ROUTE_AUDIT, listUnmountedBackendRoutes, validateRouteAudit } from './reg001RouteAudit.js';
import { REG_REGISTRY_AUDIT, listRegistryInconsistencies, validateRegistryAudit } from './reg001RegistryAudit.js';
import { REG_CONNECTIVITY_MATRIX, listBrokenChains, validateConnectivityMatrix } from './reg001ConnectivityMatrix.js';
import { REG_ROOT_CAUSE_ANALYSIS, validateRootCauseAnalysis } from './reg001RootCause.js';
import { REG_RECOVERY_PLAN, REG_RECOVERY_ORDER, validateRecoveryPlan } from './reg001RecoveryPlan.js';
import { REG_001_PHASE, REG_001_PRINCIPLE } from './reg001RecoveryMatrix.js';

export function getRecoveryMatrix() {
  return [...REG_FUNCTIONAL_RECOVERY_MATRIX];
}

export function getNavigationAudit() {
  return [...REG_NAVIGATION_AUDIT];
}

export function getRouteAudit() {
  return REG_ROUTE_AUDIT;
}

export function getRegistryAudit() {
  return [...REG_REGISTRY_AUDIT];
}

export function getConnectivityMatrix() {
  return [...REG_CONNECTIVITY_MATRIX];
}

export function getRootCauseAnalysis() {
  return REG_ROOT_CAUSE_ANALYSIS;
}

export function getRecoveryPlan() {
  return [...REG_RECOVERY_PLAN];
}

export function getOrphanApiClients() {
  return [...REG_ORPHAN_API_CLIENTS];
}

export function validateReg001Integrity() {
  const checks = [
    validateRecoveryMatrix(),
    validateNavigationAudit(),
    validateRouteAudit(),
    validateRegistryAudit(),
    validateConnectivityMatrix(),
    validateRootCauseAnalysis(),
    validateRecoveryPlan()
  ];
  const issues = checks.flatMap((c) => c.issues || []);
  const allValid = checks.every((c) => c.valid !== false);
  return {
    valid: allValid && issues.length === 0,
    issues,
    phase: REG_001_PHASE,
    principle: REG_001_PRINCIPLE,
    regressions: listRegressions().length,
    orphanApis: REG_ORPHAN_API_CLIENTS.length,
    recoveryItems: REG_RECOVERY_PLAN.length,
    recoveryOrder: REG_RECOVERY_ORDER
  };
}

export {
  listRegressions,
  getFeatureAudit,
  listBrokenNavigation,
  listUnmountedBackendRoutes,
  listRegistryInconsistencies,
  listBrokenChains
};
