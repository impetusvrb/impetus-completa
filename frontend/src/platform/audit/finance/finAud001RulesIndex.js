/**
 * FIN-AUD-001 — Rule Discovery (read-only · sem modificar regras).
 */
export const FIN_RULES_INDEX = Object.freeze([
  Object.freeze({
    ruleId: 'view_financial_rbac',
    type: 'permission',
    location: 'backend/src/middleware/authorize.js',
    description: 'VIEW_FINANCIAL gate para dados financeiros',
    domain: 'platform_governance'
  }),
  Object.freeze({
    ruleId: 'can_see_costs',
    type: 'calculation_gate',
    location: 'backend/src/services/dashboardChartDataService.js',
    description: 'can_see_costs derivado de role/perms — CEO, financeiro, VIEW_FINANCIAL',
    domain: 'platform_dashboard',
    note: 'M1.15 documenta divergência role-based vs RBAC table'
  }),
  Object.freeze({
    ruleId: 'prompt_firewall_financial',
    type: 'validation',
    location: 'backend/src/middleware/promptFirewall.js',
    description: 'Bloqueia prompts financeiros sem VIEW_FINANCIAL',
    domain: 'cognitive_governance'
  }),
  Object.freeze({
    ruleId: 'domain_isolation_finance',
    type: 'guard',
    location: 'backend/src/domainAuthority/guards/domainIsolationGuard.js',
    description: 'Domínio finance bloqueia pipelines industriais (plc, telemetry)',
    domain: 'domain_authority'
  }),
  Object.freeze({
    ruleId: 'supply_budget_compliance',
    type: 'policy',
    location: 'backend/src/domains/supply/policies/supplyDomainPolicies.js',
    description: 'budgetCompliancePolicy em purchase requests',
    domain: 'supply',
    crossDomain: true
  }),
  Object.freeze({
    ruleId: 'production_finance_widget_suppression',
    type: 'guard',
    location: 'backend/src/cognitiveRuntime/renderPromotion/production/productionWidgetSuppression.js',
    description: 'Suprime leak executive_finance em cockpit produção',
    domain: 'production',
    crossDomain: true
  }),
  Object.freeze({
    ruleId: 'financial_leakage_role_mask',
    type: 'scoring',
    location: 'backend/src/services/financialLeakageDetectorService.js',
    description: 'Mask de dados leakage por role/perfil',
    domain: 'platform_dashboard'
  }),
  Object.freeze({
    ruleId: 'nexus_billing_authorize',
    type: 'workflow',
    location: 'backend/src/services/nexusBillingEngine/index.js',
    description: 'authorize → charge → credit → reconcile pipeline billing IA',
    domain: 'nexus_ia'
  }),
  Object.freeze({
    ruleId: 'retention_fiscal_billing',
    type: 'policy',
    location: 'backend/src/governance/retentionPolicyRegistry.js',
    description: 'Retenção fiscal: token_usage, billing_ledger, subscriptions',
    domain: 'platform_governance'
  }),
  Object.freeze({
    ruleId: 'contextual_module_finance_unlock',
    type: 'workflow',
    location: 'backend/src/contextualModules/moduleCapabilities.js',
    description: 'Unlock módulos finance por function_type + area: finance',
    domain: 'contextual_modules'
  })
]);

export function listRulesByType(type) {
  return FIN_RULES_INDEX.filter((r) => r.type === type);
}

export function listCrossDomainRules() {
  return FIN_RULES_INDEX.filter((r) => r.crossDomain === true);
}

export function validateRulesIndex() {
  return { valid: FIN_RULES_INDEX.length >= 8, issues: [], count: FIN_RULES_INDEX.length };
}
