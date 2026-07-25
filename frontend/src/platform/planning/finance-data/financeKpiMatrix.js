/**
 * FIN-DATA-001 — KPI source matrix for Release 2.0 hub (READ ONLY).
 */
import { DATA_STATUS } from './financeDataInventory.js';

export const FINANCE_KPI_MATRIX = Object.freeze([
  Object.freeze({
    kpiId: 'cost_day',
    kpiLabel: 'Custo operacional / dia',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'GET /api/dashboard/costs/executive-summary',
    fieldPath: 'summary.operational.per_day',
    composePath: 'costsSummary.operational.per_day',
    status: DATA_STATUS.PARTIAL,
    note: 'API disponível; compose/hook podem precisar unwrap .summary'
  }),
  Object.freeze({
    kpiId: 'cost_month',
    kpiLabel: 'Custo operacional / mês',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'GET /api/dashboard/costs/executive-summary',
    fieldPath: 'summary.operational.per_month',
    composePath: 'costsSummary.operational.per_month',
    status: DATA_STATUS.PARTIAL,
    note: 'Mesmo contrato executive-summary'
  }),
  Object.freeze({
    kpiId: 'event_impact_24h',
    kpiLabel: 'Impacto eventos 24h',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'GET /api/dashboard/costs/executive-summary',
    fieldPath: 'summary.impact_from_events.last_day',
    composePath: 'costsSummary.impact_from_events.last_day',
    status: DATA_STATUS.PARTIAL,
    note: 'Impact service not separately routed'
  }),
  Object.freeze({
    kpiId: 'top_loss',
    kpiLabel: 'Maior perda',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'GET /api/dashboard/costs/top-loss',
    fieldPath: 'top_loss.impact | cause',
    composePath: 'topLoss.total|value|amount',
    status: DATA_STATUS.PARTIAL,
    note: 'Field naming mismatch compose vs API — normalize before 2.1'
  }),
  Object.freeze({
    kpiId: 'projected_loss',
    kpiLabel: 'Perda projectada',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'GET /api/dashboard/costs/projected-loss',
    fieldPath: 'projected_loss / hours_ahead',
    composePath: 'projectedLoss.projected|total|value',
    status: DATA_STATUS.PARTIAL,
    note: 'Normalize field aliases in compose adapter only'
  }),
  Object.freeze({
    kpiId: 'leakage_projected',
    kpiLabel: 'Impacto leakage projectado',
    sourceId: 'financial_leakage',
    owner: 'financialLeakageDetectorService',
    api: 'GET /api/dashboard/financial-leakage/projected-impact',
    fieldPath: 'projected_impact',
    composePath: 'projectedImpact.projected_impact',
    status: DATA_STATUS.AVAILABLE
  }),
  Object.freeze({
    kpiId: 'economic_proxy',
    kpiLabel: 'Custo industrial (proxy)',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService',
    api: 'executive-summary / fallback per_day',
    fieldPath: 'executive.custo_industrial (often absent)',
    composePath: 'costsSummary.executive.custo_industrial ?? op.per_day',
    status: DATA_STATUS.PARTIAL,
    note: 'No dedicated executive.custo_industrial in service — uses fallback'
  }),
  Object.freeze({
    kpiId: 'billing_status',
    kpiLabel: 'Billing / Wallet',
    sourceId: 'nexus_wallet',
    owner: 'nexusWalletService',
    api: 'GET /api/admin/nexus-wallet',
    fieldPath: 'synthesized status_label in hook',
    composePath: 'billing.status_label',
    status: DATA_STATUS.PARTIAL,
    note: 'Admin RBAC; soft-fail for non-admin CFO'
  }),
  Object.freeze({
    kpiId: 'by_origin_chart',
    kpiLabel: 'Custos por origem (chart)',
    sourceId: 'industrial_cost_service',
    owner: 'industrialCostService / chartData',
    api: 'GET /api/dashboard/costs/by-origin',
    fieldPath: 'by_origin[].label + day|hour|month',
    composePath: 'byOriginChart',
    status: DATA_STATUS.AVAILABLE
  }),
  Object.freeze({
    kpiId: 'leakage_alerts',
    kpiLabel: 'Alertas financeiros',
    sourceId: 'financial_leakage',
    owner: 'financialLeakageDetectorService',
    api: 'GET /api/dashboard/financial-leakage/alerts',
    fieldPath: 'alerts[]',
    composePath: 'leakageAlerts',
    status: DATA_STATUS.AVAILABLE
  }),
  Object.freeze({
    kpiId: 'leakage_ranking',
    kpiLabel: 'Ranking vazamentos',
    sourceId: 'financial_leakage',
    owner: 'financialLeakageDetectorService',
    api: 'GET /api/dashboard/financial-leakage/ranking',
    fieldPath: 'ranking[]',
    composePath: 'leakageRanking',
    status: DATA_STATUS.AVAILABLE
  }),
  Object.freeze({
    kpiId: 'wallet_balance',
    kpiLabel: 'Saldo Wallet (detalhe)',
    sourceId: 'nexus_wallet',
    owner: 'nexusWalletService',
    api: 'GET /api/admin/nexus-wallet',
    fieldPath: 'wallet balance fields',
    composePath: 'not on R2.0 strip as numeric KPI',
    status: DATA_STATUS.PARTIAL,
    note: 'Available in billing module; not exposed as hub numeric KPI'
  }),
  Object.freeze({
    kpiId: 'ledger_entries',
    kpiLabel: 'Ledger entries',
    sourceId: 'nexus_ledger',
    owner: 'nexusBillingEngine',
    api: 'GET /api/admin/nexus-wallet/billing-ledger',
    fieldPath: 'ledger rows',
    composePath: 'not composed on R2.0 hub',
    status: DATA_STATUS.AVAILABLE,
    note: 'Module Billing only'
  })
]);

export function getKpiSource(kpiId) {
  return FINANCE_KPI_MATRIX.find((k) => k.kpiId === kpiId) ?? null;
}

export function validateFinanceKpiMatrix() {
  const issues = [];
  const required = ['cost_day', 'top_loss', 'leakage_projected', 'billing_status', 'leakage_alerts'];
  for (const id of required) {
    if (!getKpiSource(id)) issues.push(`missing kpi ${id}`);
  }
  const statuses = FINANCE_KPI_MATRIX.map((k) => k.status);
  if (!statuses.includes(DATA_STATUS.AVAILABLE)) issues.push('expected some available KPIs');
  return { valid: issues.length === 0, issues, count: FINANCE_KPI_MATRIX.length };
}
