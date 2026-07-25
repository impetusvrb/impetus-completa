/**
 * REG-001 — Enterprise Regression Audit & Functional Recovery.
 * Read-only audit artifacts. No business logic. No remounting routes here.
 *
 * Principle: REACTIVATE BEFORE REWRITE
 */
export const REG_001_PHASE = 'REG-001';
export const REG_001_VERSION = '1.0.0';
export const REG_001_PRINCIPLE = 'REACTIVATE BEFORE REWRITE';
export const REG_001_CONTEXT =
  'Regressões introduzidas durante OPM/CPL/EOX — código preservado, ligação quebrada';

/** Classificação de causa raiz */
export const REG_ROOT_CAUSE_TYPES = Object.freeze([
  'route_not_mounted',
  'registry_inconsistent',
  'export_broken',
  'provider_missing',
  'adapter_invalid',
  'lazy_import',
  'feature_flag',
  'rbac_guard_mismatch',
  'backend_missing',
  'api_client_orphan',
  'dead_click',
  'other'
]);

/**
 * Funcionalidades auditadas — matriz de recuperação.
 * Chain: UI → Route → API client → Backend mount → Service
 */
export const REG_FUNCTIONAL_RECOVERY_MATRIX = Object.freeze([
  Object.freeze({
    id: 'mapa_vazamentos',
    label: 'Mapa de Vazamentos',
    ui: true,
    uiPath: 'frontend/src/pages/MapaVazamentoFinanceiro.jsx',
    route: true,
    routePath: '/app/mapa-vazamento-financeiro',
    apiClient: true,
    apiClientPath: 'frontend/src/services/api.js → dashboard.financialLeakage',
    backendMount: false,
    backendExpected: '/api/dashboard/financial-leakage/*',
    service: true,
    servicePath: 'backend/src/services/financialLeakageDetectorService.js',
    status: 'regression',
    breakPoint: 'api_to_http',
    rootCause: 'route_not_mounted',
    action: 'Montar rotas HTTP existentes no dashboard.js',
    priority: 1,
    severity: 'critical',
    knownSince: 'FIN-AUD-001'
  }),
  Object.freeze({
    id: 'mapa_industrial',
    label: 'Mapa Industrial',
    ui: true,
    uiPath: 'frontend/src/pages/IndustrialOperationsCenter.jsx',
    route: true,
    routePath: '/app/centro-operacoes-industrial',
    apiClient: true,
    apiClientPath: 'frontend/src/services/api.js → dashboard.industrial',
    backendMount: false,
    backendExpected: '/api/dashboard/industrial/*',
    service: true,
    servicePath: 'backend/src/services/industrialOperationalMapService.js',
    status: 'regression',
    breakPoint: 'api_to_http',
    rootCause: 'route_not_mounted',
    action: 'Montar rotas HTTP /industrial/* (serviço já existe)',
    priority: 1,
    severity: 'critical',
    secondaryIssue: 'rbac_guard_mismatch — menu mostra a diretor genérico; App.jsx redireciona para /app'
  }),
  Object.freeze({
    id: 'operational_insights',
    label: 'Operational Insights',
    ui: true,
    uiPath: 'frontend/src/pages/InsightsPage.jsx',
    route: true,
    routePath: '/app/insights',
    apiClient: true,
    apiClientPath: 'frontend/src/services/api.js → dashboard.getInsights',
    backendMount: true,
    backendExpected: 'GET /api/dashboard/insights',
    service: true,
    servicePath: 'backend/src/services/personalizedInsightsService.js (via rota)',
    status: 'partial_regression',
    breakPoint: 'rbac_guard_mismatch',
    rootCause: 'rbac_guard_mismatch',
    action: 'Alinhar Layout canAccessIndustrialCoreModules ↔ App canAccessIndustrialCore',
    priority: 2,
    severity: 'high',
    note: 'InsightsList mascara falha/vazio com defaultInsights (mock) — parece funcionar com dados fictícios'
  }),
  Object.freeze({
    id: 'cerebro_operacional',
    label: 'Cérebro Operacional',
    ui: true,
    uiPath: 'frontend/src/pages/OperationalIntelligencePanel.jsx',
    route: true,
    routePath: '/app/cerebro-operacional',
    apiClient: true,
    apiClientPath: 'frontend/src/services/api.js → dashboard.operationalBrain',
    backendMount: true,
    backendExpected: '/api/dashboard/operational-brain/*',
    service: true,
    servicePath: 'backend/src/routes/dashboardOperationalBrain.js + operationalBrainEngine.js',
    status: 'partial_regression',
    breakPoint: 'rbac_guard_mismatch',
    rootCause: 'rbac_guard_mismatch',
    action: 'Alinhar guards menu↔rota; deep-link widget Centro Comando → /app/cerebro-operacional',
    priority: 2,
    severity: 'high',
    note: 'Cadeia HTTP íntegra. Widget "Cérebro" no CC = WidgetPergunteIA (chat), não navega para a página'
  }),
  Object.freeze({
    id: 'centro_previsao_forecasting_gap',
    label: 'Centro Previsão — forecasting parcial',
    ui: true,
    uiPath: 'frontend/src/pages/CentroPrevisaoOperacional.jsx',
    route: true,
    routePath: '/app/centro-previsao-operacional',
    apiClient: true,
    apiClientPath: 'frontend/src/services/api.js → dashboard.forecasting.*',
    backendMount: 'partial',
    backendExpected: '/api/dashboard/forecasting/* (só projections, alerts, health montados)',
    service: true,
    servicePath: 'backend/src/services/operationalForecastingService.js',
    status: 'regression',
    breakPoint: 'api_to_http_partial',
    rootCause: 'route_not_mounted',
    action: 'Montar endpoints forecasting em falta OU reduzir cliente api.js',
    priority: 2,
    severity: 'high',
    missingEndpoints: Object.freeze([
      'getSimulation',
      'ask',
      'getExtendedProjections',
      'getProfitLoss',
      'getCriticalFactors',
      'simulateDecision',
      'getConfig',
      'updateConfig'
    ])
  }),
  Object.freeze({
    id: 'kpi_route_industrial_orphan',
    label: 'KPI route /app/industrial',
    ui: false,
    route: false,
    routePath: '/app/industrial',
    apiClient: false,
    backendMount: false,
    service: false,
    status: 'orphan_reference',
    breakPoint: 'dead_click',
    rootCause: 'dead_click',
    action: 'Redireccionar KPIs para /app/centro-operacoes-industrial',
    priority: 3,
    severity: 'medium',
    note: 'dashboardKPIs / adapters referenciam /app/industrial — Route inexistente em App.jsx'
  }),
  Object.freeze({
    id: 'center_widget_dead_ids',
    label: 'CenterWidget ids sem ROUTES',
    ui: true,
    uiPath: 'frontend/src/features/dashboard/widgets/CenterWidget.jsx',
    route: false,
    apiClient: false,
    backendMount: false,
    service: false,
    status: 'dead_click',
    breakPoint: 'dead_click',
    rootCause: 'dead_click',
    action: 'Mapear ids em falta no ROUTES ou remover do layout',
    priority: 3,
    severity: 'medium',
    note: 'path = "#" → onClick no-op; cerebro_operacional ausente do mapa ROUTES'
  })
]);

/** Clientes api.js órfãos (sem mount backend) — além dos 4 suspeitos */
export const REG_ORPHAN_API_CLIENTS = Object.freeze([
  Object.freeze({
    client: 'dashboard.financialLeakage.*',
    expected: '/dashboard/financial-leakage/*',
    status: 'missing_mount',
    relatedFeature: 'mapa_vazamentos'
  }),
  Object.freeze({
    client: 'dashboard.industrial.*',
    expected: '/dashboard/industrial/*',
    status: 'missing_mount',
    relatedFeature: 'mapa_industrial'
  }),
  Object.freeze({
    client: 'dashboard.forecasting (partial)',
    expected: '/dashboard/forecasting/{simulation,ask,extended-projections,profit-loss,...}',
    status: 'partial_mount',
    relatedFeature: 'centro_previsao_forecasting_gap',
    mounted: Object.freeze(['projections', 'alerts', 'health'])
  }),
  Object.freeze({
    client: 'getDynamicLayout / getColaboradorDynamicLayout',
    expected: '/dashboard/dynamic-layout',
    status: 'missing_mount'
  }),
  Object.freeze({
    client: 'getUserContext',
    expected: '/dashboard/user-context',
    status: 'missing_mount'
  }),
  Object.freeze({
    client: 'logActivity',
    expected: '/dashboard/log-activity',
    status: 'missing_mount'
  }),
  Object.freeze({
    client: 'executiveQuery',
    expected: '/dashboard/executive-query',
    status: 'missing_mount'
  }),
  Object.freeze({
    client: 'orgAiAssistant',
    expected: '/dashboard/org-ai-assistant',
    status: 'missing_mount'
  })
]);

export function listRegressions() {
  return REG_FUNCTIONAL_RECOVERY_MATRIX.filter(
    (r) => r.status === 'regression' || r.status === 'partial_regression'
  );
}

export function listByPriority(priority) {
  return REG_FUNCTIONAL_RECOVERY_MATRIX.filter((r) => r.priority === priority);
}

export function getFeatureAudit(id) {
  return REG_FUNCTIONAL_RECOVERY_MATRIX.find((r) => r.id === id) ?? null;
}

export function validateRecoveryMatrix() {
  const issues = [];
  const ids = new Set();
  for (const row of REG_FUNCTIONAL_RECOVERY_MATRIX) {
    if (ids.has(row.id)) issues.push(`duplicate: ${row.id}`);
    ids.add(row.id);
    if (!REG_ROOT_CAUSE_TYPES.includes(row.rootCause)) {
      issues.push(`invalid rootCause: ${row.id}`);
    }
  }
  const critical = REG_FUNCTIONAL_RECOVERY_MATRIX.filter((r) => r.severity === 'critical');
  if (critical.length < 2) issues.push('expected at least 2 critical regressions');
  return {
    valid: issues.length === 0,
    issues,
    count: REG_FUNCTIONAL_RECOVERY_MATRIX.length,
    regressions: listRegressions().length,
    orphanApis: REG_ORPHAN_API_CLIENTS.length
  };
}
