'use strict';

function detectContextualNoise(modules = [], ctx = {}) {
  const axis = String(ctx.canonical_identity?.domain_axis || '').toLowerCase();
  const noise = [];
  if (axis === 'hr' && modules.includes('environment_intelligence')) {
    noise.push({ module: 'environment_intelligence', type: 'cross_domain_noise' });
  }
  if (axis === 'hr' && modules.includes('safety_intelligence')) {
    noise.push({ module: 'safety_intelligence', type: 'sst_leakage_noise' });
  }
  const noiseScore = Math.min(1, noise.length * 0.25);

  return {
    noise_detected: noise.length > 0,
    noise_score: Number(noiseScore.toFixed(4)),
    items: noise
  };
}

module.exports = { detectContextualNoise };
