'use strict';

const { logPhaseZ4 } = require('./phaseZ4Logger');

function assessOperationalCoherence(user = {}, ctx = {}) {
  const tier = String(ctx.canonical_identity?.hierarchy_tier || '').toLowerCase();
  const axis = String(ctx.canonical_identity?.domain_axis || ctx.functional_axis || '').toLowerCase();
  const modules = ctx.visible_modules || [];

  let coherence = 0.7;
  if (tier === 'operational' && modules.includes('operational')) coherence += 0.15;
  if (tier === 'executive' && (modules.includes('esg') || modules.includes('audit'))) coherence += 0.1;
  if (axis === 'hr' && modules.includes('hr_intelligence') && !modules.includes('safety_intelligence')) coherence += 0.1;
  if (axis === 'hr' && modules.includes('safety_intelligence')) coherence -= 0.2;

  coherence = Math.min(1, Math.max(0, coherence));

  return {
    operational_coherence: Number(coherence.toFixed(4)),
    hierarchy_tier: tier,
    domain_axis: axis
  };
}

module.exports = { assessOperationalCoherence };
