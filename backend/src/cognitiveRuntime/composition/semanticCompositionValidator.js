'use strict';

const { validateSemanticIsolation } = require('../validation/semanticIsolationValidator');
const { QUALITY_PILOT_BLOCK_IDS } = require('../registry/qualityCognitiveBlockPack');

const FORBIDDEN_IN_QUALITY = [
  /^executive\./,
  /^sst\./,
  /^production\.line_oee$/,
  /indicadores_executivos|centro_custos|faturamento|ebitda/i
];

function validateSemanticComposition(shadowCockpit = {}, ctx = {}) {
  const errors = [];
  const warnings = [];
  const domainAxis = shadowCockpit.domain_axis || ctx.domain_axis || 'quality';
  const blockIds = (shadowCockpit.blocks || []).map((b) => b.block_id);

  if (domainAxis === 'quality') {
    for (const id of blockIds) {
      if (FORBIDDEN_IN_QUALITY.some((re) => re.test(id))) {
        errors.push({ block_id: id, reason: 'cross_domain_block_in_quality_cockpit' });
      }
    }
    const pilotSet = new Set(QUALITY_PILOT_BLOCK_IDS);
    const nonPilot = blockIds.filter((id) => !pilotSet.has(id));
    if (nonPilot.length) {
      warnings.push({ blocks: nonPilot, reason: 'non_pilot_block_in_quality_shadow' });
    }
    if (blockIds.length < 4) {
      warnings.push({ reason: 'underdelivery_minimum_blocks', count: blockIds.length });
    }
  }

  const isolation = validateSemanticIsolation(
    {
      domain_axis: domainAxis,
      eligible_blocks: blockIds.map((id) => ({ block_id: id }))
    },
    ctx
  );

  if (!isolation.semantic_isolation_valid) {
    for (const v of isolation.violations || []) {
      errors.push(v);
    }
  }

  if (ctx.governance_locked && blockIds.some((id) => id.startsWith('executive.'))) {
    errors.push({ reason: 'executive_block_while_terminal_locked' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    domain_axis: domainAxis,
    block_count: blockIds.length,
    pilot_complete: domainAxis === 'quality' && blockIds.length >= 6,
    rollback_safe: true,
    delivery_mutation: false
  };
}

module.exports = {
  validateSemanticComposition,
  FORBIDDEN_IN_QUALITY
};
