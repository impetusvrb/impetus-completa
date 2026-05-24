'use strict';

const c0c1 = require('../../config/phaseC0C1FeatureFlags');
const { resolveCognitiveAuthority } = require('../authority/cognitiveAuthorityResolver');
const { analyzeRuntimeDominance } = require('../delivery/runtimeDominanceAnalyzer');
const { validateCockpitAuthority } = require('../governance/cockpitAuthorityValidator');
const { inspectFallbackDominance } = require('../runtime/fallbackDominanceInspector');
const { analyzeCognitiveFragmentation } = require('../runtime/cognitiveFragmentationAnalyzer');
const { runEngineV2ComparativeAudit } = require('../audit/engineV2ComparativeAudit');
const { analyzeFrontendAuthority } = require('../frontend/frontendAuthorityAnalyzer');
const { auditOrchestrationAuthority } = require('../orchestration/orchestrationAuthorityAudit');
const { generateDeliveryAuthorityMap } = require('./deliveryAuthorityMapGenerator');
const { emitConsolidationEvent, buildConsolidationObservabilityMetrics } = require('../observability/consolidationObservability');

function _readinessScore(authority, dominance, fragmentation, frontend, cockpits) {
  let score = 0.35;
  if (authority.runtime_z_present) score += 0.2;
  if (authority.render_promotion_governs) score += 0.15;
  if (dominance.dominant_delivery_runtime === 'runtime_z') score += 0.15;
  if (fragmentation.fragmentation_score < 0.4) score += 0.1;
  if (frontend.frontend_runtime_alignment >= 0.85) score += 0.1;
  if (cockpits.cockpit_authority_ratio >= 0.4) score += 0.05;
  if (authority.fallback_dominance_suspected) score -= 0.15;
  return Number(Math.max(0, Math.min(1, score)).toFixed(3));
}

function _readinessLabel(score) {
  if (score >= 0.85) return 'authoritative_ready';
  if (score >= 0.7) return 'controlled_convergence';
  if (score >= 0.5) return 'shadow_consolidation';
  return 'fragmented';
}

function applyCognitiveAuthorityConsolidation(user = {}, payload = {}, ctx = {}) {
  if (!c0c1.isCognitiveAuthorityAuditEnabled() && !ctx.force_cognitive_authority_audit) {
    return { payload, skipped: true, reason: 'cognitive_authority_audit_off' };
  }

  const authority = resolveCognitiveAuthority(payload, {
    ...ctx,
    cognitive_runtime_report: ctx.cognitive_runtime_report || payload.cognitive_runtime_report
  });
  const dominance = analyzeRuntimeDominance(payload, authority);
  const cockpits = validateCockpitAuthority(payload);
  const fallback = inspectFallbackDominance(payload, authority, dominance);
  const fragmentation = analyzeCognitiveFragmentation(payload, authority, dominance);
  const v2audit = runEngineV2ComparativeAudit(payload, authority, dominance);
  const frontend = analyzeFrontendAuthority(payload, {
    ...ctx,
    dominant_delivery_runtime: dominance.dominant_delivery_runtime,
    structural_complete: payload.module_access_governance?.structural_complete
  });
  const orchestration = auditOrchestrationAuthority(payload);

  const fragmentation_score = fragmentation.fragmentation_score;
  const fallback_dominance_ratio = fallback.fallback_dominance_ratio;
  const cognitive_authority_score = Number(
    (
      (dominance.dominant_delivery_runtime === 'runtime_z' ? 0.4 : 0.15) +
      cockpits.cockpit_authority_ratio * 0.25 +
      frontend.frontend_runtime_alignment * 0.2 +
      (1 - fragmentation_score) * 0.15 -
      fallback_dominance_ratio * 0.2
    ).toFixed(3)
  );

  const unification = _readinessScore(authority, dominance, fragmentation, frontend, cockpits);

  const cognitive_authority_runtime = {
    official_runtime: authority.official_runtime,
    fallback_runtime: authority.fallback_runtime,
    engine_v2_status: v2audit.status || authority.engine_v2_status,
    dominant_delivery_runtime: dominance.dominant_delivery_runtime,
    fragmentation_detected: fragmentation.fragmentation_detected,
    fallback_dominance_ratio,
    cognitive_authority_score,
    frontend_runtime_alignment: frontend.frontend_runtime_alignment,
    runtime_unification_readiness: _readinessLabel(unification),
    phase: 'C0-C1',
    consolidation_freeze_active: c0c1.isCognitiveConsolidationFreezeActive(),
    closest_authoritative_domain: cockpits.closest_to_authoritative,
    engine_v2_redundant: v2audit.engine_v2_redundant,
    engine_v2_adds_value: v2audit.engine_v2_adds_value,
    frontend_obeys_runtime_z: frontend.obeys_runtime_z,
    orchestration_supervised_only: orchestration.orchestration_authority === 'supervised_recommendation_only',
    auto_remediation: false,
    auto_decisions: false
  };

  const authority_map = generateDeliveryAuthorityMap(
    authority,
    dominance,
    cockpits,
    fallback,
    fragmentation,
    v2audit,
    frontend
  );

  const observability = buildConsolidationObservabilityMetrics({
    cognitive_authority_score,
    frontend_runtime_alignment: frontend.frontend_runtime_alignment,
    fragmentation_score,
    cockpit_authority_ratio: cockpits.cockpit_authority_ratio,
    fallback_dominance_ratio,
    runtime_governance_stability: authority_map.governance_stability
  });

  emitConsolidationEvent('AUTHORITY_RESOLVED', {
    tenant_id: user?.company_id,
    dominant: dominance.dominant_delivery_runtime,
    score: cognitive_authority_score
  });
  if (fallback.fallback_dominates) {
    emitConsolidationEvent('FALLBACK_DOMINANCE', { tenant_id: user?.company_id, ratio: fallback_dominance_ratio });
  }
  if (fragmentation.fragmentation_detected) {
    emitConsolidationEvent('FRAGMENTATION_DETECTED', { tenant_id: user?.company_id, score: fragmentation_score });
  }
  if (frontend.divergence_risk === 'high') {
    emitConsolidationEvent('FRONTEND_DIVERGENCE', { tenant_id: user?.company_id, predicted: frontend.predicted_source });
  }

  const enriched = {
    ...payload,
    cognitive_authority_runtime,
    cognitive_authority_map: authority_map,
    cognitive_consolidation_observability: observability
  };

  return {
    payload: enriched,
    cognitive_authority_runtime,
    authority_map,
    report: {
      authority,
      dominance,
      cockpits,
      fallback,
      fragmentation,
      v2audit,
      frontend,
      orchestration,
      observability
    }
  };
}

module.exports = { applyCognitiveAuthorityConsolidation };
