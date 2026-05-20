'use strict';

/**
 * Política mínima segura — deny-first em falha de resolução.
 * Nunca expande privilégios; substitui fail-open permissivo.
 */

const SAFE_MINIMAL_POLICY = Object.freeze({
  allow_widgets: false,
  allow_kpis: false,
  allow_ai_insights: false,
  allow_operational_context: false,
  allow_cross_domain: false,
  allow_strategic: false,
  allow_financial: false,
  allow_hr: false,
  allow_technical_runtime: false,
  sections: Object.freeze({
    operational_interactions: false,
    ai_insights: false,
    monitored_points: false,
    proposals: false,
    trend_chart: false,
    points_chart: false,
    insights_list: false,
    recent_interactions: false,
    smart_summary: false,
    plc_alerts: false,
    kpi_request: false,
    communication_panel: false
  })
});

const SAFE_MINIMAL_EXPOSURE = Object.freeze({
  visible_modules: ['dashboard'],
  denied_modules: [],
  widgets: [],
  kpis: [],
  ai_insights: false,
  allow_ai_insights: false,
  allow_kpis: false,
  allow_widgets: false,
  allow_operational_context: false,
  allow_cross_domain: false,
  contextual_cards: [],
  cognitive_suggestions: false,
  runtime_summaries: false,
  sections: { ...SAFE_MINIMAL_POLICY.sections },
  cognitive_envelope: Object.freeze({
    depth: 'minimal',
    domains: [],
    strategic_access: false,
    cross_domain_access: false,
    ai_inference_scope: 'none',
    telemetry_visibility: 'none'
  }),
  policy_source: 'safe_minimal_failsafe',
  failsafe: true
});

module.exports = {
  SAFE_MINIMAL_POLICY,
  SAFE_MINIMAL_EXPOSURE
};
