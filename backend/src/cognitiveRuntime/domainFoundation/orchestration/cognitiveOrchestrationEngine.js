'use strict';

const flagsZ24 = require('../../config/phaseZ24FeatureFlags');
const { superviseComposition } = require('../runtime/adaptiveCompositionSupervisor');

function orchestrateCockpitComposition(user = {}, payload = {}, ctx = {}) {
  if (!flagsZ24.isCognitiveOrchestrationEnabled() && !ctx.force_orchestration) {
    return { ok: false, reason: 'orchestration_off', composition: null };
  }

  const supervised = superviseComposition(user, payload, ctx);
  if (!supervised.ok) return supervised;

  const blocks = supervised.composed_blocks || [];
  const prioritized = blocks.map((b, i) => ({
    ...b,
    orchestration_priority: i,
    relevance: b.balanced_score ?? b.effective_score ?? 0.5,
    density_slot: Math.min(i, (supervised.cockpit_density?.max_centers ?? 6) - 1)
  }));

  return {
    ok: true,
    orchestrated_blocks: prioritized,
    domain: supervised.domain,
    domain_label: supervised.domain_label,
    cockpit_ready: supervised.cockpit_ready,
    blended_weights: supervised.blended_weights,
    semantic_fidelity: supervised.semantic_fidelity,
    isolation: supervised.isolation,
    block_count: prioritized.length,
    ready_domains: supervised.ready_domains
  };
}

module.exports = { orchestrateCockpitComposition };
