'use strict';

/**
 * Metadados de painéis adaptativos por banda (sem render — só plano assistivo).
 */
const PANEL_PLAN = Object.freeze({
  operator: ['scan', 'task', 'confirm'],
  technician: ['scan', 'task', 'governance_hint'],
  supervisor: ['queue', 'throughput', 'exceptions'],
  coordinator: ['queue', 'analytics_lite', 'governance'],
  manager: ['kpi', 'backlog', 'risk'],
  director: ['executive_kpi', 'heatmap', 'maturity'],
  auditor: ['audit_trail', 'compliance'],
  production: ['widget']
});

function planAdaptivePanels(band, domain) {
  const base = PANEL_PLAN[band] || PANEL_PLAN.operator;
  return {
    ok: true,
    band,
    domain,
    panels: base,
    max_visible: band === 'operator' || band === 'production' ? 3 : 5,
    assistive_only: true
  };
}

module.exports = { planAdaptivePanels, PANEL_PLAN };
