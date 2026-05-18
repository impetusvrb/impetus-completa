'use strict';

const obs = require('../shared/environmentExecutiveObservability');

function environmentExecutiveMaturityRuntime(pack) {
  let score = 0.25;
  if (pack.esg?.analytics?.overview?.esg_score) score += pack.esg.analytics.overview.esg_score / 500;
  if (pack.sustainability?.analytics?.sustainability_score) score += pack.sustainability.analytics.sustainability_score / 500;
  if (pack.carbon?.ok) score += 0.1;
  if (pack.risk?.scoring) score += 0.1;
  if (pack.intelligence?.ok) score += 0.15;
  score = Math.min(1, score);
  const readiness = score > 0.55 ? 'executive_ready' : 'shadow_executive_baseline';
  obs.record('environment_executive_maturity_score', score, {});
  obs.record('environment_executive_environmental_readiness', readiness === 'executive_ready' ? 1 : 0, {});
  const cognitive_density = pack.cognitive?.maturity?.cognitive_density_score;
  if (cognitive_density != null) {
    obs.record('environment_executive_cognitive_density_score', cognitive_density, {});
  }
  return {
    executive_maturity_score: score,
    environmental_readiness: readiness,
    shadow: true
  };
}

module.exports = { environmentExecutiveMaturityRuntime };
