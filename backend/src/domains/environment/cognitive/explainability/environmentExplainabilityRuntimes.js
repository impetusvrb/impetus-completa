'use strict';

const { buildCognitiveExplainability } = require('./environmentCognitiveExplainability');
const COG = require('../events/cognitiveEventHints');

function environmentNarrativeRuntime(pack) {
  const parts = [];
  if (pack.risk?.severity) parts.push(`Risco ambiental ${pack.risk.severity} (score ${(pack.risk.environmental_risk_score || 0).toFixed(2)}).`);
  if (pack.drift?.drift_detected) parts.push('Deriva operacional detectada em séries de processo.');
  if (pack.trend?.severity === 'high') parts.push('Tendência de deterioração em indicadores-chave.');
  if (pack.cross_domain?.cross_domain_correlation_score > 0.5) {
    parts.push('Correlações multi-domínio relevantes (produção, energia, logística).');
  }
  return {
    ok: true,
    headline: 'Narrativa ambiental contextual (assistiva)',
    paragraphs: parts.length ? parts : ['Sem sinais críticos no pacote atual — monitorização contínua recomendada.'],
    assistive_only: true,
    related_event_hints: [COG.ENVIRONMENTAL_NARRATIVE_GENERATED]
  };
}

function environmentReasoningRuntime(pack) {
  const steps = [];
  if (pack.risk) steps.push({ step: 'risk_composite', detail: pack.risk.factors || [] });
  if (pack.drift) steps.push({ step: 'drift_regression', detail: pack.drift.explainability?.evidence || [] });
  if (pack.recommendations?.count) steps.push({ step: 'recommendations', detail: pack.recommendations.count });
  return {
    ok: true,
    reasoning_chain: steps,
    explainability: buildCognitiveExplainability({
      rationale: 'Raciocínio ambiental encadeado — origem, contexto e impacto operacional.',
      contributing_factors: steps.map((s) => s.step),
      related_event_hints: [COG.REASONING_GENERATED]
    }),
    assistive_only: true
  };
}

function environmentComplianceExplainabilityRuntime(ctx = {}) {
  return {
    ok: true,
    framework: 'compliance_assistive',
    narrative: 'Explicabilidade de compliance — sem enforcement automático.',
    explainability: buildCognitiveExplainability({
      rationale: ctx.rationale || 'Regras e evidências contextuais para auditoria humana.',
      context: { layer: 'compliance' }
    })
  };
}

function environmentEsgExplainabilityRuntime(ctx = {}) {
  return {
    ok: true,
    framework: 'esg_assistive',
    pillars: ctx.pillars || ['environmental', 'social', 'governance'],
    explainability: buildCognitiveExplainability({
      rationale: 'ESG explainability — scores derivados de metadados declarados.',
      context: { esg_score: ctx.esg_score }
    })
  };
}

function environmentTelemetryExplainabilityRuntime(ctx = {}) {
  return {
    ok: true,
    telemetry_type: ctx.telemetry_type || 'generic',
    anomaly_score: ctx.anomaly_score,
    explainability: buildCognitiveExplainability({
      rationale: 'Telemetria normalizada — limiar e deriva assistivos.',
      context: { environmental_area: ctx.environmental_area },
      related_event_hints: ['environment.telemetry.threshold_exceeded']
    })
  };
}

function environmentRecommendationExplainabilityRuntime(reco) {
  return {
    ok: true,
    recommendation_id: reco?.id,
    explainability: reco?.explainability || buildCognitiveExplainability({ rationale: 'Recomendação contextual auditável.' })
  };
}

module.exports = {
  environmentNarrativeRuntime,
  environmentReasoningRuntime,
  environmentComplianceExplainabilityRuntime,
  environmentEsgExplainabilityRuntime,
  environmentTelemetryExplainabilityRuntime,
  environmentRecommendationExplainabilityRuntime
};
