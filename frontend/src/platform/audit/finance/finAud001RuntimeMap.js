/**
 * FIN-AUD-001 — Runtime Map (read-only).
 */
export const FIN_RUNTIME_MAP = Object.freeze([
  Object.freeze({
    runtimeId: 'finance_native',
    label: 'Finance Native Runtime',
    location: 'backend/docs/architecture/GF-021-ROADMAP.md',
    type: 'planned',
    maturity: 'placeholder',
    status: 'GREENFIELD — não implementado',
    relatedDomains: ['finance']
  }),
  Object.freeze({
    runtimeId: 'accountingRuntime',
    label: 'Accounting Runtime',
    location: null,
    type: 'planned',
    maturity: 'n/a',
    status: 'Não encontrado no codebase'
  }),
  Object.freeze({
    runtimeId: 'financialRuntime',
    label: 'Financial Runtime (audit helper)',
    location: 'backend/src/services/audit/pilotAdoptionAssessmentService.js',
    type: 'audit_utility',
    maturity: 'experimental',
    status: '_financialRuntime() — função audit M1, não runtime domínio',
    note: 'Não confundir com finance_native'
  }),
  Object.freeze({
    runtimeId: 'nexus_billing_engine_v4',
    label: 'Nexus Billing Engine v4',
    location: 'backend/src/services/nexusBillingEngine/',
    type: 'billing_runtime',
    maturity: 'complete',
    status: 'active',
    featureFlags: ['NEXUS_BILLING_ENGINE_V4'],
    relatedDomains: ['nexus_ia']
  }),
  Object.freeze({
    runtimeId: 'cognitive_budget_runtime',
    label: 'Cognitive Budget Runtime',
    location: 'backend/src/cognitiveBudget/cognitiveBudgetRuntime.js',
    type: 'ai_infra',
    maturity: 'complete',
    status: 'active',
    note: 'Budget de contexto IA — NÃO orçamento financeiro ERP',
    crossDomain: true
  }),
  Object.freeze({
    runtimeId: 'observation_cost_control',
    label: 'Observation Cost Control Runtime',
    location: 'backend/src/runtime-z-operational-nervous-system/observation/observationCostControlRuntime.js',
    type: 'observability',
    maturity: 'partial',
    status: 'active',
    note: 'Budget observação SZ4 — não financeiro ERP',
    crossDomain: true
  }),
  Object.freeze({
    runtimeId: 'unified_cost_control',
    label: 'Unified Cost Control Service',
    location: 'backend/src/services/unifiedCostControlService.js',
    type: 'cognitive_cost',
    maturity: 'complete',
    status: 'active',
    note: 'Controlo custo cognitivo CPM — out-of-scope ERP',
    crossDomain: true
  }),
  Object.freeze({
    runtimeId: 'cognitive_economics',
    label: 'Cognitive Economics Engines',
    location: 'backend/src/cognitiveRuntime/economics/',
    type: 'cognitive_runtime',
    maturity: 'partial',
    status: 'active',
    engines: ['operationalEconomicImpactEngine', 'economicPressureIndexEngine'],
    relatedDomains: ['cognitive_runtime', 'executive']
  }),
  Object.freeze({
    runtimeId: 'cognitive_runtime_foundation',
    label: 'cognitiveRuntime multiDomainResolver',
    location: 'backend/src/cognitiveRuntime/foundation/multiDomainResolver.js',
    type: 'cognitive_runtime',
    maturity: 'complete',
    status: 'active',
    note: 'Peso financial: 0.25 em operational_focus — metadata'
  })
]);

export function getRuntimeEntry(runtimeId) {
  return FIN_RUNTIME_MAP.find((r) => r.runtimeId === runtimeId) ?? null;
}

export function listRuntimesByStatus(status) {
  return FIN_RUNTIME_MAP.filter((r) => r.status === status || String(r.status).includes(status));
}

export function validateRuntimeMapIntegrity() {
  return { valid: FIN_RUNTIME_MAP.length >= 5, issues: [], count: FIN_RUNTIME_MAP.length };
}
