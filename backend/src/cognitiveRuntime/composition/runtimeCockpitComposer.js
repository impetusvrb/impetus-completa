'use strict';

const flagsZ19 = require('../config/phaseZ19FeatureFlags');
const { logPhaseZ19 } = require('../phaseZ19Logger');
const { runContextualComposition } = require('./contextualCompositionEngine');
const { buildShadowCockpit } = require('./shadowCockpitBuilder');
const { scoreComposedCockpit } = require('./cognitiveCompositionScorer');
const { validateSemanticComposition } = require('./semanticCompositionValidator');
const { computeCompositionGap } = require('./compositionShadowResolver');
const { compareGenericVsSpecialized } = require('../pilot/qualityCockpitCompare');
const { enrichShadowCockpit } = require('../bridge/shadowEnrichmentPipeline');
const flagsZ20 = require('../config/phaseZ20FeatureFlags');

function isCompositionEngineActive(ctx = {}) {
  return (
    flagsZ19.isCompositionEngineEnabled() ||
    flagsZ19.isQualityCockpitShadowActive() ||
    flagsZ19.isCompositionObservabilityEnabled() ||
    ctx.force_composition === true
  );
}

/**
 * Runtime Cognitive Composition Engine — monta cockpit shadow especializado.
 * Nunca substitui legacy; compara genérico vs especializado.
 */
async function composeRuntimeCockpit(user = {}, payload = {}, ctx = {}) {
  if (!isCompositionEngineActive(ctx)) {
    return {
      skipped: true,
      reason: 'composition_engine_off',
      phase: 'Z.19',
      delivery_mutation: false
    };
  }

  const compositionRun = runContextualComposition(user, payload, ctx);
  let shadowCockpit = buildShadowCockpit(compositionRun, payload, ctx);
  let engineBridge = null;

  if (
    (compositionRun.domain_axis === 'quality' || payload.profile_code?.includes('quality')) &&
    (flagsZ20.isShadowEnrichmentEnabled() || flagsZ20.isQualityEngineBridgeEnabled())
  ) {
    const enriched = await enrichShadowCockpit(shadowCockpit, user, payload, {
      ...ctx,
      mock_signals: ctx.mock_signals
    });
    if (!enriched.enrichment_skipped) {
      shadowCockpit = enriched.shadow_cockpit;
      engineBridge = enriched.bridge_validation;
    }
  }

  const validation = validateSemanticComposition(shadowCockpit, {
    ...ctx,
    domain_axis: compositionRun.domain_axis,
    governance_locked: compositionRun.governance_locked,
    hierarchy_tier: compositionRun.hierarchy_tier
  });

  const compositionScore = scoreComposedCockpit(
    shadowCockpit,
    shadowCockpit.generic_cockpit_snapshot,
    { domain_axis: compositionRun.domain_axis, profile_code: compositionRun.profile_code }
  );
  const comparison = compareGenericVsSpecialized(payload, shadowCockpit, compositionScore);
  const comparisonDetail = buildCockpitComparison(shadowCockpit, compositionRun, payload);

  const compositionGap = computeCompositionGap(
    {
      eligible_blocks: compositionRun.composition_result?.eligible_blocks || []
    },
    compositionRun.composition_ctx || {}
  );

  const result = {
    phase: 'Z.19',
    layer: 'runtime-cognitive-composition-engine',
    mode: flagsZ19.qualityCockpitPilotMode() === 'shadow' ? 'shadow' : 'observability',
    delivery_mutation: false,
    legacy_cockpit_preserved: true,
    replace_legacy: false,
    composition_run: compositionRun,
    shadow_cognitive_cockpit: shadowCockpit,
    cockpit_comparison: comparison,
    cockpit_comparison_detail: comparisonDetail,
    composition_score: compositionScore,
    composition_gap: compositionGap,
    semantic_validation: validation,
    recommended_block_ids: compositionRun.recommended_block_ids,
    engine_bridge: engineBridge,
    enrichment_phase: engineBridge ? 'Z.20' : null
  };

  if (flagsZ19.isCompositionObservabilityEnabled()) {
    logPhaseZ19('SHADOW_COCKPIT_COMPOSED', {
      tenant_id: user?.company_id,
      profile: compositionRun.profile_code,
      blocks: shadowCockpit.block_count,
      delta_vs_generic: compositionScore.delta_vs_generic,
      valid: validation.valid
    });
  }

  return result;
}

function buildCockpitComparison(shadowCockpit, compositionRun, payload) {
  const generic = shadowCockpit.generic_cockpit_snapshot || {};
  const specializedIds = (shadowCockpit.blocks || []).map((b) => b.block_id);
  const genericIds = (generic.items || []).map((i) => i.id).filter(Boolean);

  return {
    generic_cockpit: {
      type: generic.cockpit_type,
      item_count: generic.item_count,
      genericity_ratio: generic.genericity_ratio,
      item_ids: genericIds,
      generic_item_ids: (generic.generic_items || []).map((i) => i.id)
    },
    specialized_shadow_cockpit: {
      cockpit_id: shadowCockpit.cockpit_id,
      block_count: shadowCockpit.block_count,
      block_ids: specializedIds,
      layout: shadowCockpit.layout
    },
    semantic_delta: {
      blocks_added_semantically: specializedIds.filter(
        (id) => !genericIds.some((g) => g && id.includes(String(g)))
      ),
      generic_items_not_in_specialized: (generic.generic_items || []).map((i) => i.id),
      coverage_improvement_expected: true,
      specialization_ratio:
        specializedIds.length / Math.max(generic.item_count || 1, 1)
    },
    persona_weighting: compositionRun.operational_weighting,
    render_substitution_active: false
  };
}

module.exports = {
  composeRuntimeCockpit,
  isCompositionEngineActive,
  buildCockpitComparison
};
