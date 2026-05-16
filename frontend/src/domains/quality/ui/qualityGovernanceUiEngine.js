/**
 * Manifesto UI de governação — analytics / explainability (carregar só na camada estratégica).
 */

export function qualityGovernanceUiEngineManifest(ctx = {}) {
  return {
    engine_id: 'quality_governance_ui_engine',
    version: 1,
    layer: 'governance',
    deployment: ctx.deployment || {},
    components: [
      { id: 'capa_board', kind: 'workflow_board' },
      { id: 'fmea_panel', kind: 'risk_matrix' },
      { id: 'spc_workspace', kind: 'spc_charts' },
      { id: 'pareto_module', kind: 'pareto' },
      { id: 'ishikawa_canvas', kind: 'cause_canvas' },
      { id: 'supplier_quality', kind: 'supplier_scorecard' },
      { id: 'recall_timeline', kind: 'timeline' },
      { id: 'cost_of_poor_quality', kind: 'finance_analytics' }
    ],
    ai_assistant_profile: 'governance_analyst'
  };
}

export default { qualityGovernanceUiEngineManifest };
