'use strict';

const c4 = require('../config/phaseC4FeatureFlags');
const { evaluateProductionControlledAuthority } = require('./productionControlledAuthorityRuntime');
const { evaluateProductionAuthorityEscalation } = require('./productionAuthorityEscalationEngine');
const { analyzeProductionFrontendConvergence } = require('./frontend/productionFrontendConvergenceRuntime');
const { buildProductionRuntimeDeliveryMap } = require('./frontend/productionRuntimeDeliveryMap');
const { certifyRuntimeDelivery } = require('./certification/runtimeDeliveryCertificationEngine');
const { certifyFallbackLeakage } = require('./certification/fallbackLeakageCertification');
const { validateOperationalTruth } = require('./truth/operationalTruthValidationEngine');
const { validateEconomicReality } = require('./truth/economicRealityValidator');
const { computeExecutiveOperationalAlignment } = require('./executive/executiveOperationalAlignmentRuntime');
const { validateExecutiveNarrativeIntegrity } = require('./executive/executiveNarrativeIntegrityValidator');
const { emitC4 } = require('./observability/cognitiveC4Observability');

function applyCognitiveC4ProductionAuthority(user = {}, payload = {}, ctx = {}) {
  if (!c4.isProductionAuthoritativeControlled() && !ctx.force_cognitive_c4) {
    return { payload, skipped: true, reason: 'c4_production_authoritative_off' };
  }

  let authority = evaluateProductionControlledAuthority(payload, {});
  const frontend = c4.isFrontendConvergenceEnabled()
    ? analyzeProductionFrontendConvergence(payload, authority)
    : { frontend_convergence_score: 0.5, convergence_safe: false };

  authority = evaluateProductionControlledAuthority(payload, {
    frontend_convergence_score: frontend.frontend_convergence_score,
    escalation_safe: false,
    certification_safe: false
  });

  const deliveryMap = buildProductionRuntimeDeliveryMap(payload, authority);
  const escalation = evaluateProductionAuthorityEscalation(payload, authority, frontend);

  authority = evaluateProductionControlledAuthority(payload, {
    frontend_convergence_score: frontend.frontend_convergence_score,
    escalation_safe: escalation.escalation_safe,
    certification_safe: false
  });

  const certification = c4.isDeliveryCertificationEnabled()
    ? certifyRuntimeDelivery(payload, authority, frontend, deliveryMap, escalation)
    : { certification_safe: false };

  authority = evaluateProductionControlledAuthority(payload, {
    frontend_convergence_score: frontend.frontend_convergence_score,
    escalation_safe: escalation.escalation_safe,
    certification_safe: certification.certification_safe
  });

  const leakage = certifyFallbackLeakage(payload, deliveryMap, frontend, escalation);

  const graph = payload.production_operational_graph_runtime || {};
  const bottleneck = payload.production_bottleneck_runtime || {};
  const causal = graph.causal || {};

  const operationalTruth = c4.isOperationalTruthEnabled()
    ? validateOperationalTruth(payload, graph, bottleneck, causal)
    : { operational_truth_score: 0 };

  const economicTruth = validateEconomicReality(payload, operationalTruth, bottleneck);

  const executiveAlignment = c4.isExecutiveAlignmentEnabled()
    ? computeExecutiveOperationalAlignment(payload, operationalTruth, economicTruth)
    : { executive_alignment_score: 0 };

  const executiveNarrative = validateExecutiveNarrativeIntegrity(payload, executiveAlignment, operationalTruth);

  if (authority.authority_mode === 'AUTHORITATIVE_CONTROLLED' && escalation.escalation_safe) {
    emitC4('PRODUCTION_AUTHORITATIVE_ESCALATED', {
      tenant_id: user?.company_id,
      score: authority.runtime_authority_score,
      channels: escalation.authoritative_channels
    });
  }

  if (certification.certification_safe) emitC4('DELIVERY_CERTIFIED', { tenant_id: user?.company_id });
  if (leakage.fallback_leakage_detected) {
    emitC4('FALLBACK_LEAKAGE_DETECTED', { tenant_id: user?.company_id, severity: leakage.leakage_severity });
  }
  emitC4('OPERATIONAL_TRUTH_VALIDATED', { tenant_id: user?.company_id, score: operationalTruth.operational_truth_score });
  if (economicTruth.heuristic_drift !== 'stable') {
    emitC4('ECONOMIC_DRIFT_DETECTED', { tenant_id: user?.company_id, drift: economicTruth.heuristic_drift });
  }
  emitC4('EXECUTIVE_ALIGNMENT_UPDATED', { tenant_id: user?.company_id, score: executiveAlignment.executive_alignment_score });
  emitC4('FRONTEND_CONVERGENCE_UPDATED', { tenant_id: user?.company_id, score: frontend.frontend_convergence_score });

  const production_authority_runtime = { ...authority, escalation, leakage };
  const production_frontend_convergence = { ...frontend, delivery_map_summary: deliveryMap };
  const production_delivery_certification = { ...certification, leakage };
  const operational_truth_runtime = operationalTruth;
  const economic_truth_runtime = economicTruth;
  const executive_alignment_runtime = { ...executiveAlignment, narrative: executiveNarrative };

  const cognitive_c4_summary = {
    phase: 'C4',
    domain: 'production',
    authority_mode: authority.authority_mode,
    escalation_safe: escalation.escalation_safe,
    certification_safe: certification.certification_safe,
    convergence_safe: frontend.convergence_safe,
    operational_truth_score: operationalTruth.operational_truth_score,
    economic_accuracy: economicTruth.economic_accuracy_score,
    executive_alignment: executiveAlignment.executive_alignment_score,
    rollback_ready: authority.rollback_ready,
    auto_remediation: false,
    auto_decisions: false,
    authoritative_global: false
  };

  const enriched = {
    ...payload,
    production_authority_runtime,
    production_frontend_convergence,
    production_delivery_certification,
    operational_truth_runtime,
    economic_truth_runtime,
    executive_alignment_runtime,
    cognitive_c4_summary
  };

  return {
    payload: enriched,
    production_authority_runtime,
    production_frontend_convergence,
    production_delivery_certification,
    operational_truth_runtime,
    economic_truth_runtime,
    executive_alignment_runtime,
    cognitive_c4_summary,
    report: { authority, escalation, frontend, deliveryMap, certification, leakage, operationalTruth, economicTruth, executiveAlignment, executiveNarrative }
  };
}

module.exports = { applyCognitiveC4ProductionAuthority };
