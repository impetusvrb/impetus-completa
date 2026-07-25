/**
 * FIN-AUD-001 — Module Map (módulos existentes · incl. ocultos/experimentais).
 */
export const FIN_MODULE_MAP = Object.freeze([
  Object.freeze({
    moduleId: 'financial_intelligence',
    label: 'Financial Intelligence',
    type: 'contextual_module',
    paths: ['/app/centro-custos-industriais', '/app/mapa-vazamento-financeiro'],
    registry: 'backend/src/contextualModules/moduleRegistry.js',
    visibility: 'registered',
    activation: 'contextual_unlock',
    maturity: 'complete',
    uiComponents: ['CentroCustosExecutivo', 'MapaVazamentoFinanceiro'],
    backendServices: ['industrialCostService', 'financialLeakageDetectorService']
  }),
  Object.freeze({
    moduleId: 'cost_center',
    label: 'Cost Center',
    type: 'contextual_module',
    paths: ['/app/admin/centro-custos', '/app/centro-custos-industriais'],
    registry: 'backend/src/contextualModules/moduleRegistry.js',
    visibility: 'registered',
    activation: 'contextual_unlock',
    maturity: 'complete',
    uiComponents: ['CentroCustosAdmin', 'CentroCustosExecutivo', 'WidgetCentroCustos'],
    backendServices: ['industrialCostService']
  }),
  Object.freeze({
    moduleId: 'losses_map',
    label: 'Losses Map',
    type: 'contextual_module',
    paths: ['/app/mapa-vazamento-financeiro'],
    registry: 'backend/src/contextualModules/moduleRegistry.js',
    visibility: 'registered',
    activation: 'contextual_unlock',
    maturity: 'partial',
    note: 'UI activa; API financial-leakage routes gap',
    uiComponents: ['MapaVazamentoFinanceiro', 'WidgetMapaVazamentos'],
    backendServices: ['financialLeakageDetectorService']
  }),
  Object.freeze({
    moduleId: 'centro_previsao_operacional',
    label: 'Centro Previsão Operacional',
    type: 'contextual_module',
    paths: ['/app/centro-previsao-operacional'],
    registry: 'backend/src/contextualModules/moduleRegistry.js',
    visibility: 'registered',
    activation: 'contextual_unlock',
    maturity: 'partial',
    crossDomain: true,
    uiComponents: ['CentroPrevisaoOperacional', 'WidgetCentroPrevisao'],
    backendServices: ['operationalForecastingService']
  }),
  Object.freeze({
    moduleId: 'nexus_billing_admin',
    label: 'Nexus IA Billing Admin',
    type: 'admin_module',
    paths: ['/app/admin/nexusia-custos'],
    registry: null,
    visibility: 'route_only',
    activation: 'admin_role',
    maturity: 'complete',
    uiComponents: ['NexusIACustos'],
    backendServices: ['nexusWalletService', 'nexusBillingEngine', 'billingTokenService']
  }),
  Object.freeze({
    moduleId: 'finance_native',
    label: 'Finance Native Domain',
    type: 'planned_domain',
    paths: ['/app/finance'],
    registry: 'frontend/src/presentation/eox/eoxRegistry.js',
    visibility: 'eox_inactive',
    activation: 'not_started',
    maturity: 'placeholder',
    note: 'GREENFIELD — domains/finance não existe'
  }),
  Object.freeze({
    moduleId: 'centro_comando_finance_widgets',
    label: 'Centro Comando Finance Widgets',
    type: 'dashboard_widgets',
    paths: ['Centro de Comando — layout finance_management'],
    registry: 'backend/src/config/dashboardProfiles.js',
    visibility: 'profile_gated',
    activation: 'VIEW_FINANCIAL / finance_management profile',
    maturity: 'partial',
    uiComponents: [
      'WidgetCentroCustos',
      'WidgetMapaVazamentos',
      'WidgetGraficoCustosSetor',
      'WidgetGraficoMargem',
      'WidgetDesperdicio',
      'WidgetIndicadoresExecutivos'
    ]
  })
]);

export function getModuleMapEntry(moduleId) {
  return FIN_MODULE_MAP.find((m) => m.moduleId === moduleId) ?? null;
}

export function listModulesByMaturity(maturity) {
  return FIN_MODULE_MAP.filter((m) => m.maturity === maturity);
}

export function listHiddenOrExperimentalModules() {
  return FIN_MODULE_MAP.filter(
    (m) => m.visibility !== 'registered' || m.maturity === 'placeholder' || m.maturity === 'partial'
  );
}

export function validateModuleMapIntegrity() {
  const issues = [];
  for (const m of FIN_MODULE_MAP) {
    if (!m.moduleId || !m.label) issues.push('module missing id/label');
  }
  return { valid: issues.length === 0, issues, count: FIN_MODULE_MAP.length };
}
