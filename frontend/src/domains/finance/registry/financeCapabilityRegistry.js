/**
 * FIN-EVOLVE-001 — Finance Capability Registry (reutiliza FIN-AUD-001 · sem mover implementações).
 */
import { FIN_AUD_DISCOVERY_CATALOG } from '../../../platform/audit/finance/finAud001DiscoveryIndex.js';
import { FIN_MODULE_MAP } from '../../../platform/audit/finance/finAud001ModuleMap.js';

export const FIN_EVOLVE_001_PHASE = 'FIN-EVOLVE-001';
export const FIN_EVOLVE_001_STRATEGY = 'integrate_then_develop';
export const FIN_EVOLVE_001_PRINCIPLE = 'INTEGRATE BEFORE DEVELOP';

const INTEGRATION_STRATEGY = Object.freeze({
  reuse_route: 'Expor rota existente no workspace Finance',
  reuse_api: 'Consumir contrato API existente',
  compose: 'Composição no integration layer — sem novo engine'
});

/** Capabilities integradas na Fase A — exclusivamente existentes */
export const FINANCE_CAPABILITY_REGISTRY = Object.freeze([
  Object.freeze({
    capabilityId: 'industrial_costs',
    label: 'Industrial Costs',
    origin: 'platform_dashboard',
    provider: 'backend/src/services/industrialCostService.js',
    owner: 'Platform / Dashboard',
    contract: 'dashboard.costs',
    integrationStrategy: INTEGRATION_STRATEGY.reuse_route,
    uiRoute: '/app/centro-custos-industriais',
    financeRoute: '/app/finance/costs',
    reusedComponent: 'CentroCustosExecutivo',
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'financial_leakage',
    label: 'Financial Leakage',
    origin: 'platform_dashboard',
    provider: 'backend/src/services/financialLeakageDetectorService.js',
    owner: 'Platform / Dashboard',
    contract: 'dashboard.financialLeakage',
    integrationStrategy: INTEGRATION_STRATEGY.reuse_api,
    uiRoute: '/app/mapa-vazamento-financeiro',
    financeRoute: '/app/finance/leakage',
    reusedComponent: 'MapaVazamentoFinanceiro',
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'nexus_billing',
    label: 'Nexus Billing',
    origin: 'nexus_ia',
    provider: 'backend/src/services/nexusBillingEngine/',
    owner: 'Nexus IA Platform',
    contract: 'nexusWallet.admin',
    integrationStrategy: INTEGRATION_STRATEGY.reuse_route,
    uiRoute: '/app/admin/nexusia-custos',
    financeRoute: '/app/finance/billing',
    reusedComponent: 'NexusIACustos',
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'nexus_wallet',
    label: 'Nexus Wallet',
    origin: 'nexus_ia',
    provider: 'backend/src/services/nexusWalletService.js',
    owner: 'Nexus IA Platform',
    contract: 'nexusWallet.admin',
    integrationStrategy: INTEGRATION_STRATEGY.compose,
    reusedComponent: 'NexusIACustos',
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'nexus_ledger',
    label: 'Nexus Ledger',
    origin: 'nexus_ia',
    provider: 'backend/src/services/nexusBillingEngine/ (ledger)',
    owner: 'Nexus IA Platform',
    contract: 'nexusWallet.admin',
    integrationStrategy: INTEGRATION_STRATEGY.compose,
    reusedComponent: 'NexusIACustos',
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'view_financial',
    label: 'VIEW_FINANCIAL RBAC',
    origin: 'platform_governance',
    provider: 'backend/src/middleware/authorize.js',
    owner: 'Platform Security',
    contract: 'VIEW_FINANCIAL',
    integrationStrategy: INTEGRATION_STRATEGY.compose,
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'contextual_finance_modules',
    label: 'Contextual Finance Modules',
    origin: 'contextual_modules',
    provider: 'backend/src/contextualModules/moduleRegistry.js',
    owner: 'Contextual Modules Engine',
    contract: 'contextualModules unlock',
    integrationStrategy: INTEGRATION_STRATEGY.compose,
    modules: Object.freeze(['financial_intelligence', 'cost_center', 'losses_map']),
    phase: FIN_EVOLVE_001_PHASE
  }),
  Object.freeze({
    capabilityId: 'centro_comando_finance_widgets',
    label: 'Centro Comando Finance Widgets',
    origin: 'command_center',
    provider: 'backend/src/config/dashboardProfiles.js',
    owner: 'Centro de Comando',
    contract: 'finance_management profile',
    integrationStrategy: INTEGRATION_STRATEGY.reuse_route,
    uiRoute: '/app/centro-comando',
    phase: FIN_EVOLVE_001_PHASE
  })
]);

export function getFinanceCapability(capabilityId) {
  return FINANCE_CAPABILITY_REGISTRY.find((c) => c.capabilityId === capabilityId) ?? null;
}

export function validateFinanceCapabilityRegistry() {
  const issues = [];
  if (FINANCE_CAPABILITY_REGISTRY.length < 6) issues.push('incomplete capability registry');
  const auditIds = new Set(FIN_AUD_DISCOVERY_CATALOG.map((e) => e.id));
  if (!auditIds.has('industrial_cost_service')) issues.push('FIN-AUD source mismatch');
  if (FIN_MODULE_MAP.length < 5) issues.push('FIN-AUD module map unavailable');
  return { valid: issues.length === 0, issues, count: FINANCE_CAPABILITY_REGISTRY.length };
}
