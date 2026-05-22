'use strict';

const { detectGenericityInDelivery } = require('./genericityDetector');
const { computeDeliverySemanticScore } = require('./deliverySemanticScore');
const { listBlocksByDomain } = require('../registry/cognitiveBlockRegistry');

function inspectSemanticDelivery(payload = {}, ctx = {}) {
  const domainAxis =
    ctx.domain_axis ||
    payload.functional_axis ||
    payload.functional_area ||
    'quality';
  const profileCode = payload.profile_code || ctx.profile_code || '';
  const profileDomainMatch =
    profileCode.includes(String(domainAxis)) ||
    (domainAxis === 'quality' && /quality|qualidade/i.test(profileCode));

  const crossDomainSignals = [];
  const modules = payload.sidebar_governance_runtime?.final_visible_modules || payload.visible_modules || [];
  if (domainAxis === 'quality' && modules.some((m) => /safety|sst/i.test(m))) {
    crossDomainSignals.push({ type: 'module', item: 'safety_in_quality_profile' });
  }
  const kpis = payload.kpis || [];
  if (domainAxis === 'quality') {
    for (const k of kpis) {
      const label = String(k.label || k.title || '');
      if (/faturamento|lucro|ebitda|oee\s*global/i.test(label)) {
        crossDomainSignals.push({ type: 'kpi', item: label });
      }
    }
  }

  const registryBlocks = listBlocksByDomain(domainAxis);
  const genericity = detectGenericityInDelivery(payload, {
    ...ctx,
    domain_axis: domainAxis
  });

  const compositionGap = ctx.composition_gap || {
    missing_semantic_categories: genericity.ideal_semantic_missing,
    generic_delivered_types: genericity.generic_hits.map((h) => h.item),
    semantic_coverage_ratio:
      registryBlocks.length > 0
        ? Math.max(
            0,
            (registryBlocks.length - genericity.ideal_semantic_missing.length) /
              registryBlocks.length
          )
        : 0
  };

  const semanticScore = computeDeliverySemanticScore(
    {
      domain_axis: domainAxis,
      profile_domain_match: profileDomainMatch,
      domain_isolation_ok: crossDomainSignals.length === 0,
      cross_domain_signals: crossDomainSignals,
      registry_blocks_available: registryBlocks.length
    },
    genericity,
    compositionGap
  );

  return {
    domain_axis: domainAxis,
    profile_code: profileCode,
    profile_domain_match: profileDomainMatch,
    domain_isolation_ok: crossDomainSignals.length === 0,
    cross_domain_signals: crossDomainSignals,
    registry_blocks_available: registryBlocks.length,
    genericity,
    composition_gap: compositionGap,
    semantic_score: semanticScore,
    delivery_classification: semanticScore.interpretation,
    cognitive_composition_ready: registryBlocks.length >= 3 && !semanticScore.dimensions.executive_leakage
  };
}

module.exports = {
  inspectSemanticDelivery
};
