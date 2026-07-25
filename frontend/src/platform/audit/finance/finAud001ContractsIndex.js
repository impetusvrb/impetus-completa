/**
 * FIN-AUD-001 — Contract Audit (APIs, integrações, adapters, consumers).
 */
export const FIN_CONTRACTS_INDEX = Object.freeze([
  Object.freeze({
    contractId: 'dashboard.costs',
    type: 'api_client',
    provider: 'backend/src/routes/dashboard.js',
    consumer: 'frontend/src/services/api.js',
    endpoints: [
      'GET /api/dashboard/costs/by-origin',
      'GET /api/dashboard/costs/executive-summary',
      'GET/POST/PUT/DELETE /api/dashboard/costs/items',
      'GET /api/dashboard/costs/top-loss',
      'GET /api/dashboard/costs/projected-loss'
    ],
    status: 'active'
  }),
  Object.freeze({
    contractId: 'dashboard.financialLeakage',
    type: 'api_client',
    provider: 'backend/src/services/financialLeakageDetectorService.js',
    consumer: 'frontend/src/services/api.js',
    endpoints: [
      'GET /api/dashboard/financial-leakage/map',
      'GET /api/dashboard/financial-leakage/ranking',
      'GET /api/dashboard/financial-leakage/alerts',
      'GET /api/dashboard/financial-leakage/report',
      'GET /api/dashboard/financial-leakage/projected-impact'
    ],
    status: 'broken',
    note: 'Cliente definido; rotas HTTP não montadas em dashboard.js'
  }),
  Object.freeze({
    contractId: 'nexusWallet.admin',
    type: 'api_client',
    provider: 'backend/src/routes/admin/nexusWallet.js',
    consumer: 'frontend/src/services/api.js',
    endpoints: ['GET/POST /api/admin/nexus-wallet/*', 'billing-ledger', 'reconcile'],
    status: 'active'
  }),
  Object.freeze({
    contractId: 'nexusCustos.admin',
    type: 'api_client',
    provider: 'backend/src/routes/admin/nexusCustos.js',
    consumer: 'frontend/src/services/api.js',
    endpoints: ['GET /api/admin/nexus-custos'],
    status: 'active'
  }),
  Object.freeze({
    contractId: 'VIEW_FINANCIAL',
    type: 'permission_contract',
    provider: 'backend/src/middleware/authorize.js',
    consumers: [
      'promptFirewall.js',
      'smartPanelCommandService.js',
      'secureContextBuilder.js',
      'dashboardChartDataService.js',
      'dashboardAccessService.js'
    ],
    status: 'active'
  }),
  Object.freeze({
    contractId: 'SpendCenterContract',
    type: 'domain_contract',
    provider: 'backend/src/domains/supply/contracts/interfaces.js',
    consumer: 'backend/src/domains/supply/services/SpendAnalysisService.js',
    status: 'partial',
    crossDomain: true
  }),
  Object.freeze({
    contractId: 'BudgetReference',
    type: 'value_object',
    provider: 'backend/src/domains/supply/model/valueObjects.js',
    consumer: 'supply domain policies',
    status: 'experimental',
    crossDomain: true
  }),
  Object.freeze({
    contractId: 'forecasting.profitLoss',
    type: 'api_client',
    provider: 'backend/src/routes/dashboard.js',
    consumer: 'frontend/src/services/api.js',
    endpoints: ['GET /api/dashboard/forecasting/profit-loss'],
    status: 'active',
    crossDomain: true
  }),
  Object.freeze({
    contractId: 'smartPanel.financeiro_dataset',
    type: 'cognitive_contract',
    provider: 'backend/src/services/smartPanelCommandService.js',
    consumer: 'SmartPanel / DynamicClaudePanelRenderer',
    status: 'active'
  }),
  Object.freeze({
    contractId: 'domain_authority.finance_pipelines',
    type: 'registry_contract',
    provider: 'backend/src/domainAuthority/registry/domainRegistry.js',
    declaredPipelines: ['financial_intelligence', 'cost_center', 'budget', 'cashflow'],
    declaredWidgets: ['cost_center', 'budget_variance', 'cashflow'],
    status: 'metadata_only'
  })
]);

export function getContractEntry(contractId) {
  return FIN_CONTRACTS_INDEX.find((c) => c.contractId === contractId) ?? null;
}

export function listBrokenContracts() {
  return FIN_CONTRACTS_INDEX.filter((c) => c.status === 'broken');
}

export function listContractsByStatus(status) {
  return FIN_CONTRACTS_INDEX.filter((c) => c.status === status);
}

export function validateContractsIndex() {
  const broken = listBrokenContracts();
  return {
    valid: FIN_CONTRACTS_INDEX.length >= 8,
    issues: broken.map((c) => `broken contract: ${c.contractId}`),
    count: FIN_CONTRACTS_INDEX.length,
    brokenCount: broken.length
  };
}
