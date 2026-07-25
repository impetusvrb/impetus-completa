/**
 * FIN-AUD-001 — Gap Analysis (derivado da auditoria · read-only).
 */
import { FIN_AUD_DISCOVERY_CATALOG, FINANCE_DOMAIN_STATUS } from './finAud001DiscoveryIndex.js';
import { FIN_CAPABILITY_INVENTORY } from './finAud001CapabilityInventory.js';
import { FIN_MODULE_MAP } from './finAud001ModuleMap.js';
import { FIN_RUNTIME_MAP } from './finAud001RuntimeMap.js';
import { FIN_CONTRACTS_INDEX, listBrokenContracts } from './finAud001ContractsIndex.js';
import { FIN_COGNITIVE_CAPABILITIES } from './finAud001CognitiveAudit.js';
import { listCrossDomainReferences } from './finAud001DiscoveryIndex.js';

export const FIN_GAP_ANALYSIS = Object.freeze({
  generatedAt: '2026-07-19',
  phase: 'FIN-AUD-001',

  whatExists: Object.freeze({
    industrialCostIntelligence: 'complete — service + API + UI admin/executivo',
    contextualFinanceModules: 'complete registry — financial_intelligence, cost_center, losses_map',
    nexusBillingWallet: 'complete — motor v4, wallet, ledger, admin UI',
    viewFinancialGovernance: 'complete — RBAC, prompt firewall, smart panel dataset',
    dashboardFinanceWidgets: 'partial–complete — Centro Comando widgets custos/vazamentos',
    cognitiveEconomics: 'partial — operational economic impact, não ERP finance'
  }),

  whatIsConsolidated: Object.freeze([
    'industrialCostService + dashboard /costs/* API',
    'CentroCustosExecutivo + CentroCustosAdmin',
    'nexusBillingEngine v4 + nexusWalletService',
    'VIEW_FINANCIAL governance chain',
    'contextualModules finance category registry'
  ]),

  whatIsIncomplete: Object.freeze([
    'financialLeakageDetectorService — rotas HTTP /financial-leakage/* não montadas',
    'MapaVazamentoFinanceiro — UI activa, API gap',
    'domainRegistry finance pipelines budget/cashflow — metadata only',
    'EOX finance entry — active: false',
    'finance_native runtime — GREENFIELD'
  ]),

  whatIsDuplicated: Object.freeze([
    'Custos: industrialCostService vs aioiBottleneckCostService (índices relativos AIOI — scope diferente)',
    'Recomendações advisory: forecasting + smart panel + leakage — sem engine finance central (by design CPL)',
    'Centro custos: página dedicada + widgets Centro Comando (mesma API — reutilização OK)'
  ]),

  whatCanBeReused: Object.freeze([
    'industrialCostService + costs API como base inteligência financeira operacional',
    'financialLeakageDetectorService — activar rotas existentes (não reimplementar)',
    'contextualModules registry + moduleCapabilities unlock',
    'VIEW_FINANCIAL + dashboardProfiles finance_management',
    'domainAuthority finance metadata para futuro finance_native',
    'CPL governance lifecycle/ownership para futuro finance_adapter',
    'Supply BudgetReference como referência cross-domain procurement'
  ]),

  whatMustBeDeveloped: Object.freeze([
    'Domínio Finance nativo (finance_native) — contabilidade, AP/AR, tesouraria, reconciliação bancária',
    'accountingRuntime / financialRuntime ERP — não existe',
    'Pipelines budget/cashflow declarados em domainRegistry',
    'CPL finance_adapter (quando domínio existir)',
    'Widgets budget_variance, cashflow (declarados, não implementados)',
    'Integração ERP statutory GL (MES/ERP actual é produção only)'
  ]),

  criticalFinding: Object.freeze({
    id: 'financial_leakage_routes_gap',
    severity: 'high',
    description: 'financialLeakageDetectorService implementado; 5 endpoints consumidos por api.js não montados em dashboard.js',
    recommendation: 'AUDIT BEFORE BUILD — activar rotas antes de novo engine leakage'
  }),

  crossDomainReferences: Object.freeze(
    listCrossDomainReferences().map((e) => ({
      id: e.id,
      domain: e.domain,
      location: e.location,
      note: 'Registado como referência cruzada — não migrar para Finance'
    }))
  ),

  financeDomainStatus: FINANCE_DOMAIN_STATUS,

  summary: Object.freeze({
    discoveryCount: FIN_AUD_DISCOVERY_CATALOG.length,
    inventoryCount: FIN_CAPABILITY_INVENTORY.length,
    moduleCount: FIN_MODULE_MAP.length,
    runtimeCount: FIN_RUNTIME_MAP.length,
    contractCount: FIN_CONTRACTS_INDEX.length,
    brokenContracts: listBrokenContracts().length,
    cognitiveGaps: FIN_COGNITIVE_CAPABILITIES.filter((c) => c.status === 'not_found').length
  })
});

export function getGapAnalysis() {
  return FIN_GAP_ANALYSIS;
}

export function validateGapAnalysis() {
  const issues = [];
  if (!FIN_GAP_ANALYSIS.criticalFinding) issues.push('missing critical finding');
  if (FIN_GAP_ANALYSIS.summary.brokenContracts < 1) {
    issues.push('expected at least 1 broken contract documented');
  }
  return { valid: issues.length === 0, issues, summary: FIN_GAP_ANALYSIS.summary };
}
