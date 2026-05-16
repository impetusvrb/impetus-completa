'use strict';

/**
 * Descriptor engine — camada de governação (analytics, explainability, inteligência).
 */

function baseManifest() {
  return {
    engine_id: 'quality_governance_ui_engine',
    version: 1,
    layer: 'governance',
    origin_layer: 'governance',
    principles: [
      'explainability_first',
      'traceability_chain',
      'governance_density_high',
      'analytics_safe',
      'audit_ready'
    ],
    components: [
      { id: 'capa_board', kind: 'workflow_board', load_hint: 'domains/quality/shells/CapaBoard' },
      { id: 'fmea_panel', kind: 'risk_matrix', load_hint: 'domains/quality/shells/FmeaPanel' },
      { id: 'spc_workspace', kind: 'spc_charts', load_hint: 'domains/quality/shells/SpcWorkspace' },
      { id: 'pareto_module', kind: 'pareto', load_hint: 'domains/quality/shells/ParetoModule' },
      { id: 'ishikawa_canvas', kind: 'cause_canvas', load_hint: 'domains/quality/shells/IshikawaCanvas' },
      { id: 'supplier_quality', kind: 'supplier_scorecard', load_hint: 'domains/quality/shells/SupplierQuality' },
      { id: 'recall_timeline', kind: 'timeline', load_hint: 'domains/quality/shells/RecallTimeline' },
      { id: 'cost_of_poor_quality', kind: 'finance_analytics', load_hint: 'domains/quality/shells/CopqPanel' }
    ],
    ai_assistant_profile: 'governance_analyst',
    forbidden: ['kiosk_fullscreen', 'single_field_ultra_low_density']
  };
}

function descriptor(ctx = {}) {
  const m = baseManifest();
  m.deployment = {
    company_id: ctx.companyId || null,
    operational_density: ctx.operationalDensity || 'minimal',
    governance_density: ctx.governanceDensity || 'high',
    cognitive_budget: ctx.cognitiveBudget || {},
    intended_audience: ctx.intendedAudience || 'analyst',
    origin_layer: ctx.originLayer || 'governance'
  };
  if (ctx.tenantRow?.industry_profile?.analytics_profile) {
    m.analytics_profile = ctx.tenantRow.industry_profile.analytics_profile;
  }
  return m;
}

module.exports = {
  qualityGovernanceUiEngine: { baseManifest, descriptor }
};
