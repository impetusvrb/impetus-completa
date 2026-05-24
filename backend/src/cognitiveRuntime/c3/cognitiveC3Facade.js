'use strict';

const c3 = require('../config/phaseC3FeatureFlags');
const { buildProductionOperationalGraph } = require('../productionGraph/productionOperationalGraphEngine');
const { resolveCrossDomainCausality } = require('../productionGraph/crossDomainCausalResolver');
const { detectOperationalBottleneck } = require('../productionGraph/operationalBottleneckIntelligence');
const { calculateOperationalEconomicImpact } = require('../economics/operationalEconomicImpactEngine');
const { evaluatePreventiveActionEconomics } = require('../economics/preventiveActionEconomicEvaluator');
const { computeEconomicPressureIndex } = require('../economics/economicPressureIndexEngine');
const { computeRealConfidence } = require('../confidence/realConfidenceEngine');
const { validateConfidenceConsistency } = require('../confidence/confidenceConsistencyValidator');
const { trackConfidenceEvolution } = require('../confidence/confidenceEvolutionTracker');
const { validateCognitiveUtility } = require('../utility/cognitiveUtilityValidationEngine');
const { correlateOperatorFeedback } = require('../utility/operatorFeedbackCorrelationEngine');
const { computeCognitiveTrustIndex } = require('../utility/cognitiveTrustIndexEngine');
const { getOperationalTimeline } = require('../context/operationalContextEngine');
const { emitC3 } = require('./observability/cognitiveC3Observability');

function applyCognitiveC3Intelligence(user = {}, payload = {}, ctx = {}) {
  const anyEnabled =
    c3.isProductionGraphEnabled() ||
    c3.isEconomicIntelligenceEnabled() ||
    c3.isRealConfidenceEnabled() ||
    c3.isCognitiveUtilityEnabled();

  if (!anyEnabled && !ctx.force_cognitive_c3) {
    return { payload, skipped: true, reason: 'cognitive_c3_off' };
  }

  const events = getOperationalTimeline(user);
  const memory = payload.operational_memory_runtime || {};
  const inference = payload.inference_validation_runtime || {};

  let graph = { nodes: [], node_count: 0 };
  let causal = { chains: [] };
  let bottleneck = {};

  if (c3.isProductionGraphEnabled() || ctx.force_cognitive_c3) {
    graph = buildProductionOperationalGraph(payload, events);
    causal = resolveCrossDomainCausality(graph, events);
    bottleneck = detectOperationalBottleneck(graph, causal);
    emitC3('PRODUCTION_GRAPH_UPDATED', { tenant_id: user?.company_id, nodes: graph.node_count });
    if (bottleneck.propagation_risk === 'high') {
      emitC3('BOTTLENECK_PROPAGATION_DETECTED', {
        tenant_id: user?.company_id,
        type: bottleneck.primary_bottleneck?.node_type
      });
    }
  }

  let economic = {};
  let preventive = {};
  let pressure = {};

  if (c3.isEconomicIntelligenceEnabled() || ctx.force_cognitive_c3) {
    economic = calculateOperationalEconomicImpact(payload, graph, bottleneck);
    preventive = evaluatePreventiveActionEconomics(economic, bottleneck, causal);
    pressure = computeEconomicPressureIndex(payload, graph, economic);
    emitC3('ECONOMIC_IMPACT_CALCULATED', {
      tenant_id: user?.company_id,
      loss: economic.estimated_loss,
      risk: economic.economic_risk_level
    });
  }

  let confidence = {};
  let confidenceValidation = {};
  let evolution = {};

  if (c3.isRealConfidenceEnabled() || ctx.force_cognitive_c3) {
    confidence = computeRealConfidence(payload, graph, memory, inference);
    confidenceValidation = validateConfidenceConsistency(confidence, memory, graph);
    evolution = trackConfidenceEvolution(user, confidence, confidenceValidation);
    emitC3('CONFIDENCE_REBALANCED', {
      tenant_id: user?.company_id,
      unified: confidenceValidation.fallback_confidence_applied
    });
  }

  let utility = {};
  let feedback = {};
  let trust = {};

  if (c3.isCognitiveUtilityEnabled() || ctx.force_cognitive_c3) {
    utility = validateCognitiveUtility(payload, inference);
    feedback = correlateOperatorFeedback(payload, utility);
    trust = computeCognitiveTrustIndex(confidence, utility, inference, feedback);
    emitC3('COGNITIVE_UTILITY_UPDATED', { tenant_id: user?.company_id, score: utility.cognitive_utility_score });
    emitC3('TRUST_INDEX_UPDATED', { tenant_id: user?.company_id, trust: trust.cognitive_trust_index });
  }

  const production_operational_graph_runtime = {
    phase: 'C3',
    graph,
    causal,
    graph_readiness: graph.graph_readiness,
    auto_decisions: false
  };

  const operational_economic_runtime = {
    ...economic,
    preventive: preventive.top_preventive,
    preventive_recommendations: preventive.recommendations,
    auto_remediation: false
  };

  const economic_pressure_runtime = pressure;
  const real_confidence_runtime = {
    ...confidence,
    validation: confidenceValidation,
    evolution
  };
  const cognitive_utility_runtime = utility;
  const cognitive_trust_runtime = trust;
  const production_bottleneck_runtime = bottleneck;

  const enriched = {
    ...payload,
    production_operational_graph_runtime,
    operational_economic_runtime,
    economic_pressure_runtime,
    real_confidence_runtime,
    cognitive_utility_runtime,
    cognitive_trust_runtime,
    production_bottleneck_runtime,
    cognitive_c3_summary: {
      phase: 'C3',
      bottleneck: bottleneck.primary_bottleneck?.node_type,
      economic_pressure: pressure.economic_pressure_index,
      unified_confidence: confidenceValidation.fallback_confidence_applied ?? confidence.unified_confidence_score,
      cognitive_trust: trust.cognitive_trust_index,
      auto_decisions: false,
      authoritative_global: false
    }
  };

  return {
    payload: enriched,
    production_operational_graph_runtime,
    operational_economic_runtime,
    economic_pressure_runtime,
    real_confidence_runtime,
    cognitive_utility_runtime,
    cognitive_trust_runtime,
    production_bottleneck_runtime,
    report: { graph, causal, bottleneck, economic, preventive, pressure, confidence, utility, trust }
  };
}

module.exports = { applyCognitiveC3Intelligence };
