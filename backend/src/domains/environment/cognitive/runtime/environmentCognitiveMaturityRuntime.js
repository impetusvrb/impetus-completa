'use strict';

const { clamp01 } = require('../shared/environmentCognitiveStats');

function environmentCognitiveMaturityRuntime(pack) {
  let score = 0.2;
  if (pack.risk?.ok) score += 0.15;
  if (pack.drift?.ok) score += 0.1;
  if (pack.cross_domain?.ok) score += 0.15;
  if (pack.recommendations?.count) score += 0.15;
  if (pack.narrative?.ok) score += 0.1;
  if (pack.reasoning?.ok) score += 0.1;
  score = clamp01(score);
  const readiness = score > 0.55 ? 'operational_cognitive_ready' : 'shadow_cognitive_baseline';
  return {
    environmental_maturity_score: score,
    environmental_readiness_score: clamp01(score + 0.1),
    cognitive_density_score: clamp01((pack.recommendations?.count || 0) * 0.05 + score * 0.5),
    readiness_label: readiness,
    assistive_only: true
  };
}

module.exports = { environmentCognitiveMaturityRuntime };
