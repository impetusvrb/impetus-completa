/**
 * REG-001 — Enterprise Regression Audit & Functional Recovery.
 * Read-only. REACTIVATE BEFORE REWRITE.
 */
export {
  REG_001_PHASE,
  REG_001_VERSION,
  REG_001_PRINCIPLE,
  REG_001_CONTEXT,
  REG_ROOT_CAUSE_TYPES,
  REG_FUNCTIONAL_RECOVERY_MATRIX,
  REG_ORPHAN_API_CLIENTS,
  listRegressions,
  listByPriority,
  getFeatureAudit,
  validateRecoveryMatrix
} from './reg001RecoveryMatrix.js';

export {
  REG_NAVIGATION_AUDIT,
  listBrokenNavigation,
  validateNavigationAudit
} from './reg001NavigationAudit.js';

export {
  REG_ROUTE_AUDIT,
  listUnmountedBackendRoutes,
  validateRouteAudit
} from './reg001RouteAudit.js';

export {
  REG_REGISTRY_AUDIT,
  listRegistryInconsistencies,
  validateRegistryAudit
} from './reg001RegistryAudit.js';

export {
  REG_CONNECTIVITY_MATRIX,
  listBrokenChains,
  validateConnectivityMatrix
} from './reg001ConnectivityMatrix.js';

export { REG_ROOT_CAUSE_ANALYSIS, validateRootCauseAnalysis } from './reg001RootCause.js';

export {
  REG_RECOVERY_PLAN,
  REG_RECOVERY_ORDER,
  listRecoveryByPriority,
  validateRecoveryPlan
} from './reg001RecoveryPlan.js';

export {
  getRecoveryMatrix,
  getNavigationAudit,
  getRouteAudit,
  getRegistryAudit,
  getConnectivityMatrix,
  getRootCauseAnalysis,
  getRecoveryPlan,
  getOrphanApiClients,
  validateReg001Integrity
} from './reg001AuditApi.js';

/** REG-002 — Functional Recovery & Certification */
export {
  REG_002_PHASE,
  REG_002_PRINCIPLE,
  REG_002_CRITICAL_NAV_ITEMS,
  REG_002_DEEP_LINKS,
  REG_002_RESOLVED_DEAD_CLICKS,
  listCriticalNavItems,
  getCriticalNavItem,
  validateDeadClickMatrix
} from './reg002DeadClickMatrix.js';
