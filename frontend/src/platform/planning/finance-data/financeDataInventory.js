/**
 * FIN-DATA-001 — Financial data source inventory (READ ONLY).
 * Principle: DATA BEFORE INTELLIGENCE
 */
export const FIN_DATA_001_PHASE = 'FIN-DATA-001';
export const FIN_DATA_001_PRINCIPLE = 'DATA BEFORE INTELLIGENCE';
export const FIN_DATA_001_SCOPE = Object.freeze({
  implementsFeatures: false,
  createsServices: false,
  modifiesBusinessRules: false,
  modifiesArchitecture: false,
  discoveryOnly: true
});

export const DATA_STATUS = Object.freeze({
  AVAILABLE: 'available',
  PARTIAL: 'partial',
  ABSENT: 'absent'
});

/**
 * Canonical inventory of platform data sources relevant to Finance releases.
 */
export const FINANCE_DATA_SOURCES = Object.freeze([
  Object.freeze({
    id: 'industrial_cost_service',
    name: 'Industrial Cost Service',
    ownerDomain: 'finance_operational',
    ownerPath: 'backend/src/services/industrialCostService.js',
    contract: 'dashboard.costs',
    publicApi: Object.freeze([
      'GET /api/dashboard/costs/executive-summary',
      'GET /api/dashboard/costs/by-origin',
      'GET /api/dashboard/costs/top-loss',
      'GET /api/dashboard/costs/projected-loss',
      'CRUD /api/dashboard/costs/items'
    ]),
    events: Object.freeze(['cost_item_upsert', 'executive_summary_read']),
    updateFrequency: 'on_read + event impact aggregation',
    dataQuality: 'high — certified REG/FIN integration path',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-002 hub', 'CentroCustosExecutivo', 'CC widgets'])
  }),
  Object.freeze({
    id: 'industrial_cost_impact_service',
    name: 'Industrial Cost Impact Service',
    ownerDomain: 'finance_operational',
    ownerPath: 'backend/src/services/industrialCostImpactService.js',
    contract: 'impact_from_events (internal)',
    publicApi: Object.freeze([]),
    events: Object.freeze(['operational_event_impact']),
    updateFrequency: 'event-driven when wired',
    dataQuality: 'medium — service exists; not mounted as dedicated route',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['industrialCostService summary nesting'])
  }),
  Object.freeze({
    id: 'unified_cost_control',
    name: 'Unified Cost Control (cognitive IA usage)',
    ownerDomain: 'cognitive_runtime',
    ownerPath: 'backend/src/services/unifiedCostControlService.js',
    contract: 'cognitive cost stats',
    publicApi: Object.freeze(['via unifiedDecisionEngine']),
    events: Object.freeze(['cognitive_usage_tracked']),
    updateFrequency: 'per cognitive call',
    dataQuality: 'high for IA cost; not industrial product costing',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['cognitive runtime', 'FIN-CONCEPT economic_performance (future)'])
  }),
  Object.freeze({
    id: 'financial_leakage',
    name: 'Financial Leakage Detector',
    ownerDomain: 'finance_operational',
    ownerPath: 'backend/src/services/financialLeakageDetectorService.js',
    contract: 'dashboard.financialLeakage',
    publicApi: Object.freeze([
      'GET /api/dashboard/financial-leakage/map',
      'GET /api/dashboard/financial-leakage/ranking',
      'GET /api/dashboard/financial-leakage/alerts',
      'GET /api/dashboard/financial-leakage/report',
      'GET /api/dashboard/financial-leakage/projected-impact'
    ]),
    events: Object.freeze(['leak_detected', 'leak_alert']),
    updateFrequency: 'on_read aggregate',
    dataQuality: 'high — REG-002 R1 recovered',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-002 alerts/insights', 'MapaVazamentoFinanceiro'])
  }),
  Object.freeze({
    id: 'nexus_billing',
    name: 'Nexus Billing Engine',
    ownerDomain: 'nexus_ia',
    ownerPath: 'backend/src/services/nexusBillingEngine/',
    contract: 'nexusWallet.admin',
    publicApi: Object.freeze([
      'GET /api/admin/nexus-wallet/billing-engine/dashboard',
      'GET /api/admin/nexus-wallet/billing-engine/reconcile'
    ]),
    events: Object.freeze(['consumption_charged', 'top_up']),
    updateFrequency: 'transactional',
    dataQuality: 'high — platform billing, not plant P&L',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['NexusIACustos', 'Finance billing module'])
  }),
  Object.freeze({
    id: 'nexus_wallet',
    name: 'Nexus Wallet',
    ownerDomain: 'nexus_ia',
    ownerPath: 'backend/src/services/nexusWalletService.js',
    contract: 'nexusWallet.admin',
    publicApi: Object.freeze(['GET /api/admin/nexus-wallet', 'PATCH /api/admin/nexus-wallet/settings']),
    events: Object.freeze(['wallet_debit', 'wallet_credit']),
    updateFrequency: 'transactional',
    dataQuality: 'high',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-002 billing_status KPI', 'admin UI'])
  }),
  Object.freeze({
    id: 'nexus_ledger',
    name: 'Nexus Billing Ledger',
    ownerDomain: 'nexus_ia',
    ownerPath: 'backend/src/services/nexusBillingEngine/ (ledger)',
    contract: 'nexusWallet.admin',
    publicApi: Object.freeze(['GET /api/admin/nexus-wallet/billing-ledger']),
    events: Object.freeze(['ledger_entry']),
    updateFrequency: 'transactional',
    dataQuality: 'high — credits ledger, not GL',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['NexusIACustos', 'Finance billing compose'])
  }),
  Object.freeze({
    id: 'wms_inventory',
    name: 'WMS Inventory',
    ownerDomain: 'logistics_wms',
    ownerPath: 'frontend/src/domains/logistics-operational/modules/inventory/',
    contract: 'wmsV1Api.listItems',
    publicApi: Object.freeze(['WMS inventory module routes /app/logistics/inventory']),
    events: Object.freeze(['stock_movement']),
    updateFrequency: 'operational',
    dataQuality: 'high qty; economic valuation via finance.wms_valuation.v1 adapter (FIN-READY-001)',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-PLAN 2.3 inventory financial optimization', 'finance_wms_valuation'])
  }),
  Object.freeze({
    id: 'supply_budget',
    name: 'Supply BudgetReference / CAPEX policy',
    ownerDomain: 'supply',
    ownerPath: 'backend/src/domains/supply/',
    contract: 'budgetCompliancePolicy / ApprovalPolicyService',
    publicApi: Object.freeze(['supply domain services (no finance public API)']),
    events: Object.freeze(['purchase_approval']),
    updateFrequency: 'procurement lifecycle',
    dataQuality: 'partial — CAPEX limit vestigial',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-PLAN backlog CAPEX'])
  }),
  Object.freeze({
    id: 'production_mes',
    name: 'Production / MES signals',
    ownerDomain: 'operational',
    ownerPath: 'backend/src/services/ (PLC / industrial map / edge)',
    contract: 'dashboard.industrial / edge ingest',
    publicApi: Object.freeze(['GET /api/dashboard/industrial/*', 'edge ingest']),
    events: Object.freeze(['machine_state', 'production_event']),
    updateFrequency: 'near-real-time when edge live',
    dataQuality: 'variable by plant instrumentation',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['Smart Costing drivers', 'Digital Twin'])
  }),
  Object.freeze({
    id: 'maintenance_manuia',
    name: 'Maintenance / ManuIA',
    ownerDomain: 'maintenance',
    ownerPath: 'backend/src/services/digitalTwin* + manutencao-ia',
    contract: 'manutencao-ia / digital-twin Applied',
    publicApi: Object.freeze(['/api/manutencao-ia/digital-twin/*']),
    events: Object.freeze(['diagnostic', 'failure_prediction']),
    updateFrequency: 'on diagnose / trend',
    dataQuality: 'operational twin strong; financial ROI absent',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-PLAN 2.3 PdM financeira'])
  }),
  Object.freeze({
    id: 'digital_twin',
    name: 'Digital Twin (plant + Applied + org)',
    ownerDomain: 'integrations_manuia_cognitive',
    ownerPath: 'backend/src/services/digitalTwinService.js',
    contract: 'integrations.digital-twin + manutencao-ia',
    publicApi: Object.freeze([
      'GET /api/integrations/digital-twin/state',
      'PUT /api/integrations/digital-twin/layout',
      '/api/manutencao-ia/digital-twin/*'
    ]),
    events: Object.freeze(['twin_state_sync']),
    updateFrequency: 'layout + machine state sync',
    dataQuality: 'high operational; no native $ layer',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-PLAN 2.2 Financial Digital Twin'])
  }),
  Object.freeze({
    id: 'recommendation_engine',
    name: 'Recommendation / AIOI / Smart Panel',
    ownerDomain: 'aioi_dashboard',
    ownerPath: 'backend/src/services/aioiCognitiveRecommendationService.js',
    contract: 'AIOI recommendations + panel-command',
    publicApi: Object.freeze(['POST /api/dashboard/panel-command']),
    events: Object.freeze(['recommendation_generated']),
    updateFrequency: 'on command',
    dataQuality: 'partial for finance-specific intents',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-EVOLVE-002 decisions (compose)', 'Release 2.2+'])
  }),
  Object.freeze({
    id: 'scenario_engine',
    name: 'CPL Scenario / OPM-008 what-if',
    ownerDomain: 'logistics_cognitive',
    ownerPath: 'frontend/.../cognitive-logistics/clScenarioUtils.js',
    contract: 'CPL ScenarioProvider',
    publicApi: Object.freeze(['in-memory runScenarioSimulation']),
    events: Object.freeze(['scenario_run']),
    updateFrequency: 'interactive',
    dataQuality: 'logistics scenarios; not financial P&L',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-PLAN 2.2 what-if'])
  }),
  Object.freeze({
    id: 'forecasting',
    name: 'Operational Forecasting',
    ownerDomain: 'dashboard_previsao',
    ownerPath: 'backend/src/services/operationalForecastingService.js',
    contract: 'dashboard.forecasting',
    publicApi: Object.freeze([
      'GET /api/dashboard/forecasting/projections',
      'GET /api/dashboard/forecasting/alerts',
      'GET /api/dashboard/forecasting/health'
    ]),
    events: Object.freeze(['forecast_alert']),
    updateFrequency: 'on_read',
    dataQuality: 'partial — client expects more routes than live mount',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['CentroPrevisao', 'FIN-PLAN 2.2'])
  }),
  Object.freeze({
    id: 'economic_engines',
    name: 'Economic Pressure / Operational Economic Impact',
    ownerDomain: 'cognitive_runtime_c3',
    ownerPath: 'economicPressureIndexEngine.js / operationalEconomicImpactEngine.js',
    contract: 'cognitiveC3Facade',
    publicApi: Object.freeze(['via cognitive runtime facade']),
    events: Object.freeze(['economic_index_computed']),
    updateFrequency: 'runtime compute',
    dataQuality: 'proxy horário; erp_integrated false',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['FIN-PLAN 2.1 performance económica'])
  }),
  Object.freeze({
    id: 'contextual_modules',
    name: 'Contextual Modules (financial_intelligence)',
    ownerDomain: 'contextual_modules',
    ownerPath: 'backend/src/contextualModules/moduleRegistry.js',
    contract: 'contextual unlock',
    publicApi: Object.freeze(['dashboard/me contextual_modules']),
    events: Object.freeze(['module_unlock']),
    updateFrequency: 'session',
    dataQuality: 'governance high; not numeric dataset',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['Layout menu', 'Finance access'])
  }),
  Object.freeze({
    id: 'cognitive_center',
    name: 'Centro Cognitivo / EOX',
    ownerDomain: 'presentation_eox',
    ownerPath: 'frontend/src/presentation/eox/',
    contract: 'EOX navigation',
    publicApi: Object.freeze(['EOX shells / DigitalTwinPanel']),
    events: Object.freeze(['eox_nav']),
    updateFrequency: 'UI',
    dataQuality: 'presentation layer',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['Finance hub shell'])
  }),
  Object.freeze({
    id: 'iot_energy',
    name: 'IoT / Energy / Edge telemetry',
    ownerDomain: 'industrial_edge',
    ownerPath: 'edgeIngestService / plc* / environment telemetry',
    contract: 'edge / PLC profiles',
    publicApi: Object.freeze(['edge ingest', 'environment telemetry domains']),
    events: Object.freeze(['telemetry_sample']),
    updateFrequency: 'streaming when enabled',
    dataQuality: 'plant-dependent; energy costing not standardized',
    status: DATA_STATUS.PARTIAL,
    consumers: Object.freeze(['Smart Costing energy driver (2.1)'])
  }),
  Object.freeze({
    id: 'finance_driver_model',
    name: 'Finance Driver → Rate Model',
    ownerDomain: 'finance_readiness',
    ownerPath: 'frontend/src/platform/readiness/finance/driver-model/',
    contract: 'finance.driver_rate.v1',
    publicApi: Object.freeze(['platform/readiness/finance driverRateModel (read-only)']),
    events: Object.freeze(['driver_mapping_declared']),
    updateFrequency: 'config / contract',
    dataQuality: 'contract-ready — no cost calculation',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-2.1', 'finance_asset_cost_map'])
  }),
  Object.freeze({
    id: 'finance_asset_cost_map',
    name: 'Finance Asset ↔ Cost Map',
    ownerDomain: 'finance_readiness',
    ownerPath: 'frontend/src/platform/readiness/finance/asset-cost-map/',
    contract: 'finance.asset_cost_map.v1',
    publicApi: Object.freeze(['platform/readiness/finance assetCostMap (read-only)']),
    events: Object.freeze(['asset_cost_link_declared']),
    updateFrequency: 'config / contract',
    dataQuality: 'structural links ready — no Twin UI',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-2.2 Financial Twin overlay'])
  }),
  Object.freeze({
    id: 'finance_wms_valuation',
    name: 'Finance WMS Valuation Adapter',
    ownerDomain: 'finance_readiness',
    ownerPath: 'frontend/src/platform/readiness/finance/valuation/',
    contract: 'finance.wms_valuation.v1',
    publicApi: Object.freeze(['platform/readiness/finance wmsValuationReadiness (read-only)']),
    events: Object.freeze(['valuation_projected']),
    updateFrequency: 'on projection from WMS rows',
    dataQuality: 'adapter ready; qty owner remains WMS',
    status: DATA_STATUS.AVAILABLE,
    consumers: Object.freeze(['FIN-EVOLVE-2.1 material carrying', 'FIN-EVOLVE-2.3'])
  })
]);

export function getDataSource(id) {
  return FINANCE_DATA_SOURCES.find((s) => s.id === id) ?? null;
}

export function listDataSourcesByStatus(status) {
  return FINANCE_DATA_SOURCES.filter((s) => s.status === status);
}

export function validateFinanceDataInventory() {
  const issues = [];
  if (FINANCE_DATA_SOURCES.length < 15) issues.push('inventory incomplete');
  const ids = new Set();
  for (const s of FINANCE_DATA_SOURCES) {
    if (ids.has(s.id)) issues.push(`duplicate source ${s.id}`);
    ids.add(s.id);
    if (!s.ownerDomain) issues.push(`${s.id} missing owner`);
    if (!s.status) issues.push(`${s.id} missing status`);
  }
  return { valid: issues.length === 0, issues, count: FINANCE_DATA_SOURCES.length };
}
