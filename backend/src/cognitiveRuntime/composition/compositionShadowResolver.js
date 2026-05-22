'use strict';

const { buildCompositionContext } = require('./compositionContextBuilder');
const { resolveEligibleBlocks } = require('./compositionEligibilityResolver');
const { validateCompositionPlan, RUNTIME_COMPOSITION_CONTRACT } = require('./runtimeCompositionContracts');
const flags = require('../config/phaseZ18FeatureFlags');

/**
 * Resolve plano de composição SHADOW — nunca muta payload de delivery.
 */
function resolveShadowCompositionPlan(user = {}, payload = {}, ctx = {}) {
  if (!flags.isCognitiveCompositionShadowEnabled() && !flags.isSemanticDeliveryObservabilityEnabled()) {
    return {
      shadow_skipped: true,
      reason: 'cognitive_composition_shadow_off',
      contract: RUNTIME_COMPOSITION_CONTRACT
    };
  }

  const compositionCtx = buildCompositionContext(user, payload, ctx);
  const eligibility = resolveEligibleBlocks(compositionCtx);

  const plan = {
    phase: 'Z.18',
    mode: 'shadow_only',
    delivery_mutation: false,
    domain_axis: compositionCtx.domain_axis,
    profile_code: compositionCtx.profile_code,
    hierarchy_tier: compositionCtx.hierarchy_tier,
    governance_locked: compositionCtx.governance_locked,
    eligible_blocks: eligibility.eligible_blocks,
    rejected_blocks: eligibility.rejected_blocks,
    recommended_block_ids: eligibility.eligible_blocks.map((b) => b.block_id),
    delivered_widget_types: compositionCtx.delivered_widget_types,
    delivered_kpi_labels: compositionCtx.delivered_kpi_labels,
    composition_gap: computeCompositionGap(eligibility, compositionCtx),
    contract: RUNTIME_COMPOSITION_CONTRACT
  };

  const validation = validateCompositionPlan(plan);
  plan.plan_valid = validation.valid;
  plan.plan_errors = validation.errors;

  return plan;
}

function computeCompositionGap(eligibility, compositionCtx) {
  const recommended = new Set(eligibility.eligible_blocks.map((b) => b.semantic_category));
  const delivered = new Set(
    (compositionCtx.delivered_widget_types || []).map((t) => normalizeDeliveredType(t))
  );
  const missing_semantic = [...recommended].filter((cat) => !deliveredHasCategory(delivered, cat));
  const generic_delivered = [...delivered].filter((t) => isGenericIndustrialType(t));

  return {
    missing_semantic_categories: missing_semantic,
    generic_delivered_types: generic_delivered,
    semantic_coverage_ratio:
      recommended.size > 0
        ? (recommended.size - missing_semantic.length) / recommended.size
        : 0
  };
}

function normalizeDeliveredType(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
}

function deliveredHasCategory(deliveredSet, category) {
  const cat = String(category).toLowerCase();
  for (const d of deliveredSet) {
    if (d.includes(cat) || cat.includes(d)) return true;
  }
  return false;
}

function isGenericIndustrialType(t) {
  return /operational_insights|recent_interactions|ai_insights|trend|department_interactions|live_metric|centro_operac|uptime|efficiencia/i.test(
    String(t)
  );
}

module.exports = {
  resolveShadowCompositionPlan,
  computeCompositionGap
};
