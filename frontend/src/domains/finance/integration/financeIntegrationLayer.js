/**
 * FIN-EVOLVE-001 — Integration layer (composição · orquestra capacidades existentes).
 * FIN-EVOLVE-001A — rotas oficiais via metadata provider.
 */
import { FINANCE_CAPABILITY_REGISTRY } from '../registry/financeCapabilityRegistry.js';
import { FINANCE_DOMAIN_IDENTITY } from '../metadata/financeDomainMetadata.js';
import { getFinanceOfficialRoute } from '../metadata/financeNavigationMetadata.js';
import { FINANCE_LEGACY_REDIRECTS } from '../compatibility/financeLegacyCompatibility.js';

const _legacyByModule = Object.fromEntries(
  FINANCE_LEGACY_REDIRECTS.map((r) => [r.moduleId, r.from])
);

export const FINANCE_INTEGRATION_LAYER_ID = 'finance_integration_layer_v1';

/** Módulos expostos no workspace — cada um reutiliza página/serviço existente */
export const FINANCE_WORKSPACE_INTEGRATIONS = Object.freeze([
  Object.freeze({
    id: 'costs',
    label: 'Centro de Custos Industriais',
    description: 'industrialCostService + dashboard /costs/*',
    capabilityId: 'industrial_costs',
    financePath: getFinanceOfficialRoute('costs'),
    legacyPath: _legacyByModule.costs,
    apiContract: 'dashboard.costs',
    component: 'CentroCustosExecutivo',
    provider: 'backend/src/services/industrialCostService.js'
  }),
  Object.freeze({
    id: 'leakage',
    label: 'Mapa de Vazamentos',
    description: 'financialLeakageDetectorService — REG-002 R1',
    capabilityId: 'financial_leakage',
    financePath: getFinanceOfficialRoute('leakage'),
    legacyPath: _legacyByModule.leakage,
    apiContract: 'dashboard.financialLeakage',
    component: 'MapaVazamentoFinanceiro',
    provider: 'backend/src/services/financialLeakageDetectorService.js'
  }),
  Object.freeze({
    id: 'billing',
    label: 'Nexus Billing · Wallet · Ledger',
    description: 'nexusBillingEngine v4 + nexusWalletService',
    capabilityId: 'nexus_billing',
    financePath: getFinanceOfficialRoute('billing'),
    legacyPath: _legacyByModule.billing,
    apiContract: 'nexusWallet.admin',
    component: 'NexusIACustos',
    provider: 'backend/src/services/nexusBillingEngine/',
    requiresAdmin: true
  }),
  Object.freeze({
    id: 'twin',
    label: 'Digital Twin Financeiro',
    description: 'Perspectiva financeira sobre Twin industrial · composição FIN-EVOLVE-2.2',
    capabilityId: 'financial_twin_perspective',
    financePath: getFinanceOfficialRoute('twin'),
    legacyPath: null,
    apiContract: 'finance.asset_cost_map.v1 + EconomicIntelligenceEngine',
    component: 'FinanceTwinFinancialView',
    provider: 'domains/finance/twin/',
    composeOnly: true
  }),
  Object.freeze({
    id: 'whatif',
    label: 'What-if Analysis',
    description: 'Cenários hipotéticos · composição temporária FIN-EVOLVE-2.3',
    capabilityId: 'financial_whatif',
    financePath: getFinanceOfficialRoute('whatif'),
    legacyPath: null,
    apiContract: 'EconomicIntelligenceEngine + Financial Twin composition',
    component: 'FinanceWhatIfView',
    provider: 'domains/finance/whatif/',
    composeOnly: true
  }),
  Object.freeze({
    id: 'prediction',
    label: 'Inteligência Financeira Preditiva',
    description: 'Consumidor Finance de platform.prediction.public_api.v1 · FIN-EVOLVE-2.4',
    capabilityId: 'financial_predictive_intelligence',
    financePath: getFinanceOfficialRoute('prediction'),
    legacyPath: null,
    apiContract: 'platform.prediction.public_api.v1',
    component: 'FinancePredictionView',
    provider: 'domains/finance/prediction/',
    composeOnly: true
  }),
  Object.freeze({
    id: 'command_center',
    label: 'Centro de Comando — Finance',
    description: 'Widgets finance_management profile',
    capabilityId: 'centro_comando_finance_widgets',
    financePath: '/app/centro-comando',
    legacyPath: '/app/centro-comando',
    component: 'CentroComando',
    external: true
  })
]);

export function buildFinanceIntegrationSnapshot() {
  return Object.freeze({
    layerId: FINANCE_INTEGRATION_LAYER_ID,
    strategy: 'integrate_then_develop',
    capabilities: FINANCE_CAPABILITY_REGISTRY.map((c) => ({
      capabilityId: c.capabilityId,
      provider: c.provider,
      contract: c.contract
    })),
    workspaceModules: FINANCE_WORKSPACE_INTEGRATIONS,
    noDuplication: Object.freeze([
      'industrialCostService',
      'financialLeakageDetectorService',
      'nexusBillingEngine',
      'nexusWalletService'
    ])
  });
}

export function getFinanceIntegration(moduleId) {
  return FINANCE_WORKSPACE_INTEGRATIONS.find((m) => m.id === moduleId) ?? null;
}

export function resolveFinanceModuleByPath(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '');
  return (
    FINANCE_WORKSPACE_INTEGRATIONS.find(
      (m) => normalized === m.financePath || normalized.startsWith(`${m.financePath}/`)
    ) ?? null
  );
}
