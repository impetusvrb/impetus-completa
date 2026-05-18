'use strict';

const { v4: uuidv4 } = require('uuid');
const { buildCognitiveExplainability } = require('../explainability/environmentCognitiveExplainability');
const COG = require('../events/cognitiveEventHints');

function _reco(kind, priority, rationale, ctx = {}) {
  return {
    id: uuidv4(),
    kind,
    priority,
    rationale,
    confidence: ctx.confidence ?? 0.6,
    risk_score: ctx.risk_score ?? null,
    origin_context: ctx.origin || 'environment_cognitive',
    environmental_area: ctx.environmental_area || 'field',
    explainability: buildCognitiveExplainability({
      rationale,
      evidence: ctx.evidence || [],
      confidence: ctx.confidence ?? 0.6,
      related_event_hints: [COG.RECOMMENDATION_GENERATED]
    }),
    assistive_only: true,
    human_review_required: true
  };
}

function environmentContextualRecommendationEngine(findings, meta = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const recommendations = list.slice(0, 24).map((f) =>
    _reco(f.kind || 'review_environmental', f.priority || 'medium', f.rationale || 'Revisão assistiva.', f)
  );
  return {
    ok: true,
    recommendations,
    emit_event: recommendations.length > 0,
    count: recommendations.length,
    correlation_id: meta.correlation_id || uuidv4()
  };
}

function environmentEnergyRecommendationRuntime(ctx) {
  return [
    _reco('energy_efficiency', 'medium', 'Rever demanda e perdas em janela de pico — tendência ascendente detectada.', {
      environmental_area: 'energy',
      confidence: ctx.confidence,
      evidence: ctx.evidence
    })
  ];
}

function environmentEmissionRecommendationRuntime(ctx) {
  return [
    _reco('emission_reduction', 'high', 'Mitigar pico de emissões — correlacionar com ritmo de produção.', {
      environmental_area: 'emissions',
      confidence: ctx.confidence,
      evidence: ctx.evidence
    })
  ];
}

function environmentWaterRecommendationRuntime(ctx) {
  return [
    _reco('water_consumption_reduction', 'medium', 'Otimizar vazão ETA — possível deriva operacional.', {
      environmental_area: 'water',
      confidence: ctx.confidence
    })
  ];
}

function environmentWasteRecommendationRuntime(ctx) {
  return [
    _reco('waste_optimization', 'medium', 'Rever segregação e geração de resíduos vs produção.', {
      environmental_area: 'waste',
      confidence: ctx.confidence
    })
  ];
}

function environmentEtaEteOptimizationRuntime(ctx) {
  return [
    _reco('eta_ete_balance', 'high', 'Equilibrar ETA/ETE — correlação consumo vs qualidade de efluente.', {
      environmental_area: 'effluent',
      confidence: ctx.confidence
    })
  ];
}

function buildRecommendationsFromPack(pack, meta) {
  const findings = [];
  if (pack.risk?.severity === 'high' || pack.risk?.severity === 'medium') {
    findings.push({
      kind: 'incident_prevention',
      priority: 'high',
      rationale: 'Risco ambiental composto elevado — revisão operacional assistiva.',
      confidence: pack.risk.environmental_risk_score
    });
  }
  if (pack.overflow?.severity === 'high') {
    findings.push({
      kind: 'overflow_prevention',
      priority: 'high',
      rationale: 'Risco de transbordo — verificar reservatórios e drenagem.',
      confidence: pack.overflow.probability
    });
  }
  if (pack.drift?.drift_detected) {
    findings.push(...environmentWaterRecommendationRuntime({ confidence: pack.drift.probability }));
  }
  if (pack.emission?.excess_emission_risk > 0.45) {
    findings.push(...environmentEmissionRecommendationRuntime({ confidence: pack.emission.excess_emission_risk }));
  }
  if (pack.energy?.severity === 'high') {
    findings.push(...environmentEnergyRecommendationRuntime({ confidence: pack.energy.probability }));
  }
  if (pack.cross_domain?.cross_domain_correlation_score > 0.55) {
    findings.push(...environmentEtaEteOptimizationRuntime({ confidence: pack.cross_domain.cross_domain_correlation_score }));
  }
  return environmentContextualRecommendationEngine(findings, meta);
}

module.exports = {
  environmentContextualRecommendationEngine,
  environmentEnergyRecommendationRuntime,
  environmentEmissionRecommendationRuntime,
  environmentWaterRecommendationRuntime,
  environmentWasteRecommendationRuntime,
  environmentEtaEteOptimizationRuntime,
  buildRecommendationsFromPack
};
