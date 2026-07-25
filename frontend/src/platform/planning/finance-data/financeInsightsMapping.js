/**
 * FIN-DATA-001 — Executive insight / alert / decision mapping (READ ONLY).
 * Maps existing FIN-EVOLVE-002 compose surfaces to data sources — no new engines.
 */
import { DATA_STATUS } from './financeDataInventory.js';

export const FINANCE_INSIGHT_MAPPING = Object.freeze([
  Object.freeze({
    id: 'insight_top_loss',
    type: 'insight',
    label: 'Maior perda operacional',
    origin: 'industrial_cost_service',
    evidence: 'GET /costs/top-loss + executive compose insights[]',
    dependencies: Object.freeze(['industrial_cost_service']),
    limitations: 'Field alias total|value|amount must be normalized in compose',
    status: DATA_STATUS.PARTIAL,
    feeds: Object.freeze(['Release 2.0 Insights', 'Decisões sugeridas'])
  }),
  Object.freeze({
    id: 'insight_leakage_rank',
    type: 'insight',
    label: 'Ranking de vazamentos',
    origin: 'financial_leakage',
    evidence: 'GET /financial-leakage/ranking',
    dependencies: Object.freeze(['financial_leakage']),
    limitations: 'Operational leakage — not GL/ERP variance',
    status: DATA_STATUS.AVAILABLE,
    feeds: Object.freeze(['Release 2.0 Insights', 'Alertas'])
  }),
  Object.freeze({
    id: 'insight_projected_impact',
    type: 'insight',
    label: 'Impacto projectado (leakage + projected-loss)',
    origin: 'financial_leakage + industrial_cost_service',
    evidence: 'projected-impact + projected-loss APIs',
    dependencies: Object.freeze(['financial_leakage', 'industrial_cost_service']),
    limitations: 'Short-horizon heuristic; not full predictive model',
    status: DATA_STATUS.AVAILABLE,
    feeds: Object.freeze(['Release 2.0 Insights', '2.2 predictive readiness'])
  }),
  Object.freeze({
    id: 'alert_leakage',
    type: 'alert',
    label: 'Alertas de leakage',
    origin: 'financial_leakage',
    evidence: 'GET /financial-leakage/alerts',
    dependencies: Object.freeze(['financial_leakage']),
    limitations: 'Severity taxonomy is leakage-native',
    status: DATA_STATUS.AVAILABLE,
    feeds: Object.freeze(['Release 2.0 Alertas'])
  }),
  Object.freeze({
    id: 'alert_forecast',
    type: 'alert',
    label: 'Alertas de forecasting operacional',
    origin: 'forecasting',
    evidence: 'GET /forecasting/alerts (when mounted)',
    dependencies: Object.freeze(['forecasting']),
    limitations: 'Not wired into Finance hub compose yet; API partial',
    status: DATA_STATUS.PARTIAL,
    feeds: Object.freeze(['Release 2.2'])
  }),
  Object.freeze({
    id: 'recommendation_aioi',
    type: 'recommendation',
    label: 'Recomendações AIOI / panel-command',
    origin: 'recommendation_engine',
    evidence: 'POST /dashboard/panel-command + AIOI cognitive',
    dependencies: Object.freeze(['recommendation_engine', 'cognitive_center']),
    limitations: 'Finance-specific intents not certified',
    status: DATA_STATUS.PARTIAL,
    feeds: Object.freeze(['Release 2.2+', 'Linguagem Natural backlog'])
  }),
  Object.freeze({
    id: 'decision_compose',
    type: 'decision',
    label: 'Decisões sugeridas (compose R2.0)',
    origin: 'financeExecutiveCompose (reuse)',
    evidence: 'composeFinanceExecutiveView decisions[] from costs + leakage',
    dependencies: Object.freeze(['industrial_cost_service', 'financial_leakage']),
    limitations: 'Heuristic compose — not a dedicated decision engine',
    status: DATA_STATUS.AVAILABLE,
    feeds: Object.freeze(['Release 2.0 Decisões'])
  }),
  Object.freeze({
    id: 'decision_economic_proxy',
    type: 'decision',
    label: 'Sinais económicos C3 (proxy)',
    origin: 'economic_engines',
    evidence: 'cognitiveC3Facade economic pressure / operational impact',
    dependencies: Object.freeze(['economic_engines']),
    limitations: 'erp_integrated false — proxy only',
    status: DATA_STATUS.PARTIAL,
    feeds: Object.freeze(['Release 2.1 performance económica'])
  }),
  Object.freeze({
    id: 'insight_by_origin',
    type: 'insight',
    label: 'Custos por origem (chart)',
    origin: 'industrial_cost_service',
    evidence: 'GET /costs/by-origin + ImpetusChart',
    dependencies: Object.freeze(['industrial_cost_service']),
    limitations: 'Chart-ready; not a narrative insight engine',
    status: DATA_STATUS.AVAILABLE,
    feeds: Object.freeze(['Release 2.0 Visão Executiva'])
  }),
  Object.freeze({
    id: 'insight_billing',
    type: 'insight',
    label: 'Estado billing / wallet',
    origin: 'nexus_wallet',
    evidence: 'admin nexus-wallet soft-fail in hub',
    dependencies: Object.freeze(['nexus_wallet', 'nexus_billing']),
    limitations: 'Admin RBAC; platform credits ≠ plant P&L',
    status: DATA_STATUS.PARTIAL,
    feeds: Object.freeze(['Release 2.0 KPI billing_status'])
  })
]);

export function listInsightsByType(type) {
  return FINANCE_INSIGHT_MAPPING.filter((r) => r.type === type);
}

export function validateFinanceInsightMapping() {
  const issues = [];
  const types = new Set(FINANCE_INSIGHT_MAPPING.map((r) => r.type));
  for (const t of ['insight', 'alert', 'recommendation', 'decision']) {
    if (!types.has(t)) issues.push(`missing type ${t}`);
  }
  for (const r of FINANCE_INSIGHT_MAPPING) {
    if (!r.origin || !r.evidence || !r.limitations) issues.push(`${r.id} incomplete`);
  }
  return { valid: issues.length === 0, issues, count: FINANCE_INSIGHT_MAPPING.length };
}
