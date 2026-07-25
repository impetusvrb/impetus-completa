/**
 * REG-002 R6 — Dead Click Matrix + Navigability Certification Catalog
 * Read-only catalogue of critical clickable items; used by automated tests.
 *
 * Critério: UI → Route → Render → API → Backend → Service
 */
export const REG_002_PHASE = 'REG-002';
export const REG_002_PRINCIPLE = 'RECONNECT BEFORE REBUILD';

/** Itens críticos priorizados (R1–R5) — devem estar navigáveis após recovery */
export const REG_002_CRITICAL_NAV_ITEMS = Object.freeze([
  Object.freeze({
    id: 'mapa_vazamentos',
    label: 'Mapa de Vazamentos',
    menuPath: '/app/mapa-vazamento-financeiro',
    pageFile: 'frontend/src/pages/MapaVazamentoFinanceiro.jsx',
    apiClient: 'dashboard.financialLeakage',
    backendMount: '/api/dashboard/financial-leakage',
    backendRouter: 'backend/src/routes/dashboardFinancialLeakage.js',
    service: 'backend/src/services/financialLeakageDetectorService.js',
    httpEndpoints: Object.freeze([
      '/map',
      '/ranking',
      '/alerts',
      '/report',
      '/projected-impact'
    ]),
    severity: 'critical',
    recoveryId: 'R1'
  }),
  Object.freeze({
    id: 'mapa_industrial',
    label: 'Mapa Industrial',
    menuPath: '/app/centro-operacoes-industrial',
    pageFile: 'frontend/src/pages/IndustrialOperationsCenter.jsx',
    apiClient: 'dashboard.industrial',
    backendMount: '/api/dashboard/industrial',
    backendRouter: 'backend/src/routes/dashboardIndustrial.js',
    service: 'backend/src/services/industrialOperationalMapService.js',
    httpEndpoints: Object.freeze(['/status', '/automation', '/machines', '/events', '/profiles']),
    severity: 'critical',
    recoveryId: 'R2'
  }),
  Object.freeze({
    id: 'operational_insights',
    label: 'Operational Insights',
    menuPath: '/app/insights',
    pageFile: 'frontend/src/pages/InsightsPage.jsx',
    apiClient: 'dashboard.getInsights',
    backendMount: '/api/dashboard/insights',
    backendRouter: 'backend/src/routes/dashboard.js',
    service: 'backend/src/services/personalizedInsightsService.js',
    httpEndpoints: Object.freeze(['']),
    severity: 'critical',
    recoveryId: 'R4',
    guardPolicy: 'industrialCoreAccess'
  }),
  Object.freeze({
    id: 'cerebro_operacional',
    label: 'Cérebro Operacional',
    menuPath: '/app/cerebro-operacional',
    pageFile: 'frontend/src/pages/OperationalIntelligencePanel.jsx',
    apiClient: 'dashboard.operationalBrain',
    backendMount: '/api/dashboard/operational-brain',
    backendRouter: 'backend/src/routes/dashboardOperationalBrain.js',
    service: 'backend/src/services/operationalBrainEngine.js',
    httpEndpoints: Object.freeze(['/summary', '/insights', '/alerts', '/timeline']),
    severity: 'critical',
    recoveryId: 'R5',
    guardPolicy: 'industrialCoreAccess'
  })
]);

/** Deep-links CenterWidget / widgets CC */
export const REG_002_DEEP_LINKS = Object.freeze([
  Object.freeze({ id: 'leak_map', path: '/app/mapa-vazamento-financeiro' }),
  Object.freeze({ id: 'industrial_map', path: '/app/centro-operacoes-industrial' }),
  Object.freeze({ id: 'cerebro_operacional', path: '/app/cerebro-operacional' }),
  Object.freeze({ id: 'insights', path: '/app/insights' }),
  Object.freeze({ id: 'cost_center', path: '/app/centro-custos-industriais' }),
  Object.freeze({ id: 'center_predictions', path: '/app/centro-previsao-operacional' })
]);

/** Dead clicks resolvidos nesta fase */
export const REG_002_RESOLVED_DEAD_CLICKS = Object.freeze([
  Object.freeze({
    id: 'kpi_industrial_orphan',
    before: '/app/industrial',
    after: '/app/centro-operacoes-industrial',
    file: 'backend/src/services/dashboardKPIs.js'
  }),
  Object.freeze({
    id: 'center_widget_cerebro_insights',
    before: 'path=#',
    after: 'ROUTES.cerebro_operacional + ROUTES.insights',
    file: 'frontend/src/features/dashboard/widgets/CenterWidget.jsx'
  }),
  Object.freeze({
    id: 'guard_menu_route_divergence',
    before: 'Layout permissive ≠ App restrictive',
    after: 'industrialCoreAccess.js shared policy',
    file: 'frontend/src/utils/industrialCoreAccess.js'
  })
]);

export function listCriticalNavItems() {
  return [...REG_002_CRITICAL_NAV_ITEMS];
}

export function getCriticalNavItem(id) {
  return REG_002_CRITICAL_NAV_ITEMS.find((i) => i.id === id) ?? null;
}

export function validateDeadClickMatrix() {
  const issues = [];
  for (const item of REG_002_CRITICAL_NAV_ITEMS) {
    if (!item.menuPath || !item.backendMount || !item.service) {
      issues.push(`incomplete chain: ${item.id}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    criticalCount: REG_002_CRITICAL_NAV_ITEMS.length,
    deepLinks: REG_002_DEEP_LINKS.length,
    resolved: REG_002_RESOLVED_DEAD_CLICKS.length
  };
}
