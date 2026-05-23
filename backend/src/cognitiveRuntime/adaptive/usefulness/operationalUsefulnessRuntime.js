'use strict';

function scoreDomainUsefulness(runtime, domain) {
  if (!runtime?.consolidation_applied) return null;
  const health =
    runtime[`${domain}_cognitive_health`] ||
    runtime.production_cognitive_health ||
    runtime.environmental_cognitive_health ||
    runtime.hr_cognitive_health ||
    runtime.safety_cognitive_health ||
    runtime.executive_cognitive_health ||
    runtime.cognitive_health;
  const score = health?.score ?? health?.usefulness ?? runtime.usefulness?.usefulness ?? 0.72;
  return Math.round((typeof score === 'number' ? score : 0.72) * 100) / 100;
}

function scoreOperationalUsefulness(payload = {}) {
  const domains = {
    quality: scoreDomainUsefulness(payload.specialized_cognitive_runtime, 'quality'),
    safety: scoreDomainUsefulness(payload.sst_cognitive_runtime, 'safety'),
    hr: scoreDomainUsefulness(payload.hr_cognitive_runtime, 'hr'),
    production: scoreDomainUsefulness(payload.production_cognitive_runtime, 'production'),
    environmental: scoreDomainUsefulness(payload.environmental_cognitive_runtime, 'environmental')
  };
  const vals = Object.values(domains).filter((v) => v != null);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.7;
  return { domains, operational_usefulness: Math.round(avg * 100) / 100 };
}

module.exports = { scoreOperationalUsefulness, scoreDomainUsefulness };
