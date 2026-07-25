/**
 * PRED-BASE-001 — Forecasting capability discovery (platform inventory).
 */
import { PRED_BASE_001_PHASE, PRED_BASE_STATUS } from '../predBaseConstants.js';

export const PLATFORM_FORECASTING_INVENTORY = Object.freeze([
  Object.freeze({
    id: 'operational_forecasting_service',
    label: 'Operational Forecasting Service',
    path: 'backend/src/services/operationalForecastingService.js',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Linear projections (efficiency, losses, risk) + alerts + health — live /forecasting/*'
  }),
  Object.freeze({
    id: 'operational_forecasting_routes',
    label: 'Dashboard forecasting routes',
    path: 'backend/src/routes/dashboard.js (/forecasting/*)',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'projections | alerts | health HTTP mount'
  }),
  Object.freeze({
    id: 'centro_previsao_operacional',
    label: 'Centro de Previsão Operacional',
    path: 'frontend/src/pages/CentroPrevisaoOperacional.jsx',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'CEO UI for operational projections — not Finance P&L predictive contract'
  }),
  Object.freeze({
    id: 'widget_centro_previsao',
    label: 'Widget Centro de Previsão (Command Center)',
    path: 'frontend/src/features/dashboard/centroComando/WidgetCentroPrevisao.jsx',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Consumes dashboard.forecasting.getProjections'
  }),
  Object.freeze({
    id: 'dashboard_chart_series',
    label: 'Dashboard chart / time-series service',
    path: 'backend/src/services/dashboardChartDataService.js',
    category: 'time_series',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Real BD series: trend, production-demand, pulse-climate, costs-by-origin'
  }),
  Object.freeze({
    id: 'impetus_charts',
    label: 'ImpetusChart / ImpetusChartPanel',
    path: 'frontend/src/components/charts/',
    category: 'analytics',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Canonical industrial chart surface for series rendering'
  }),
  Object.freeze({
    id: 'aioi_forecast_services',
    label: 'AIOI forecast services (backlog/capacity/SLA/risk)',
    path: 'backend/src/services/aioi/aioi*ForecastService.js',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.PARTIAL,
    scope: 'platform_horizontal',
    note: 'Read-only historical counts; HTTP exposure for enterprise consumers incomplete'
  }),
  Object.freeze({
    id: 'company_forecasting_config',
    label: 'company_forecasting_config schema',
    path: 'backend/src/models/company_forecasting_config_migration.sql',
    category: 'forecasting',
    readiness: PRED_BASE_STATUS.DISCOVERED,
    scope: 'platform_horizontal',
    note: 'Config table discovered — not a certified prediction contract'
  }),
  Object.freeze({
    id: 'digital_twin_state',
    label: 'Industrial Digital Twin state',
    path: 'backend/src/services/digitalTwinState / integrations',
    category: 'digital_twin',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Operational twin state API — representation, not prediction engine'
  }),
  Object.freeze({
    id: 'digital_twin_predictive_hooks',
    label: 'Twin diagnostic / failure prediction hooks',
    path: 'digitalTwinDiagnosticService / industrialOperationalMap.getFailurePredictions',
    category: 'digital_twin',
    readiness: PRED_BASE_STATUS.PARTIAL,
    scope: 'platform_horizontal',
    note: 'Predicted failure signals exist; not enterprise forecast contract'
  }),
  Object.freeze({
    id: 'cognitive_runtime_facade',
    label: 'Cognitive Runtime Facade',
    path: 'backend/src/cognitiveRuntime/facade/cognitiveRuntimeFacade.js',
    category: 'cognitive',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Multi-domain cognitive consolidation — orchestration, not ML predict'
  }),
  Object.freeze({
    id: 'cpl_cognitive_platform',
    label: 'CPL cognitive platform (registry/discovery/adapters)',
    path: 'frontend/src/platform/cognitive/',
    category: 'cognitive',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'CPL-001…003 catalogs recommendation_engine / predictive_insights — no CPL predict engine'
  }),
  Object.freeze({
    id: 'cognitive_discovery_forecast',
    label: 'Cognitive discovery DISC-FORECAST',
    path: 'frontend/src/platform/cognitive/discovery/cognitiveDiscoveryIndex.js',
    category: 'cognitive',
    readiness: PRED_BASE_STATUS.DISCOVERED,
    scope: 'platform_horizontal',
    note: 'Discovery placeholder pointing at forecasting surfaces'
  }),
  Object.freeze({
    id: 'recommendation_wms_canonical',
    label: 'WMS / Cognitive Logistics recommendation engine',
    path: 'domains/logistics-operational/.../clRecommendationEngine.js',
    category: 'recommendation',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'domain_logistics',
    note: 'Heuristic recommendations with confidence/evidence — pattern to reuse, not forecast'
  }),
  Object.freeze({
    id: 'recommendation_aioi',
    label: 'AIOI cognitive recommendations',
    path: 'backend/src/services/aioi/aioiCognitiveRecommendationService.js',
    category: 'recommendation',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Analytical recommendations — do not execute'
  }),
  Object.freeze({
    id: 'energy_history_certified',
    label: 'Certified plant energy history series',
    path: null,
    category: 'history',
    readiness: PRED_BASE_STATUS.NOT_AVAILABLE,
    scope: 'platform_horizontal',
    note: 'Blocks GAP-PRED-003 / energy consumers — transversal, not Finance-only'
  }),
  Object.freeze({
    id: 'enterprise_prediction_contract',
    label: 'Enterprise prediction consumer contract',
    path: 'frontend/src/platform/prediction/contracts/ + certification/',
    category: 'contracts',
    readiness: PRED_BASE_STATUS.READY,
    scope: 'platform_horizontal',
    note: 'Certified in PRED-BASE-002 — platform.prediction.v0 + public API (GAP-PB-005 closed)'
  }),
  Object.freeze({
    id: 'finance_pred_ready',
    label: 'FIN-PRED-READY-001 (domain readiness)',
    path: 'frontend/src/platform/readiness/finance-prediction/',
    category: 'domain_readiness',
    readiness: PRED_BASE_STATUS.DISCOVERED,
    scope: 'domain_finance',
    note: 'Identified platform blockers — consumer of PRED-BASE, not a platform engine'
  })
]);

export function getForecastingCapability(id) {
  return PLATFORM_FORECASTING_INVENTORY.find((c) => c.id === id) || null;
}

export function listForecastingByStatus(status) {
  return PLATFORM_FORECASTING_INVENTORY.filter((c) => c.readiness === status);
}

export function listForecastingByCategory(category) {
  return PLATFORM_FORECASTING_INVENTORY.filter((c) => c.category === category);
}

export function validatePlatformForecastingInventory() {
  const issues = [];
  if (PLATFORM_FORECASTING_INVENTORY.length < 12) issues.push('inventory incomplete');
  const ids = new Set();
  for (const c of PLATFORM_FORECASTING_INVENTORY) {
    if (ids.has(c.id)) issues.push(`duplicate ${c.id}`);
    ids.add(c.id);
    if (!Object.values(PRED_BASE_STATUS).includes(c.readiness)) {
      issues.push(`${c.id} invalid readiness`);
    }
    if (!c.category) issues.push(`${c.id} missing category`);
  }
  for (const required of [
    'operational_forecasting_service',
    'dashboard_chart_series',
    'cpl_cognitive_platform',
    'digital_twin_state',
    'energy_history_certified',
    'enterprise_prediction_contract'
  ]) {
    if (!ids.has(required)) issues.push(`missing ${required}`);
  }
  const energy = getForecastingCapability('energy_history_certified');
  if (energy?.readiness !== PRED_BASE_STATUS.NOT_AVAILABLE) {
    issues.push('energy_history_certified must be NOT_AVAILABLE until certified');
  }
  return {
    valid: issues.length === 0,
    issues,
    count: PLATFORM_FORECASTING_INVENTORY.length,
    phase: PRED_BASE_001_PHASE
  };
}
