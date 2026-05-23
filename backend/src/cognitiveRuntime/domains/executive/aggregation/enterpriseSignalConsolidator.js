'use strict';

/**
 * Agrega sinais estratégicos dos 5 domínios native — sem telemetria bruta.
 */
function consolidateEnterpriseSignals(payload = {}, ctx = {}) {
  if (ctx.mock_enterprise_signals) return { ...ctx.mock_enterprise_signals, source: 'mock' };

  const domains = {
    production: _extractDomainHealth(payload.production_cognitive_runtime, 'production'),
    quality: _extractDomainHealth(payload.specialized_cognitive_runtime || payload.quality_cognitive_runtime, 'quality'),
    safety: _extractDomainHealth(payload.sst_cognitive_runtime, 'safety'),
    hr: _extractDomainHealth(payload.hr_cognitive_runtime, 'hr'),
    environmental: _extractDomainHealth(payload.environmental_cognitive_runtime, 'environmental'),
    maintenance: _extractDomainHealth(payload.maintenance_cognitive_runtime, 'maintenance')
  };

  const scores = Object.values(domains).map((d) => d.health_score).filter((n) => n != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 72;

  return {
    source: 'multi_domain_aggregation',
    loaded_at: new Date().toISOString(),
    aggregation_readiness: scores.length >= 3 ? 'ready' : scores.length ? 'partial' : 'empty',
    domains,
    enterprise: {
      health_index: Math.round(avg),
      risk_index: Math.max(...Object.values(domains).map((d) => d.risk_score ?? 0), 0),
      maturity_index: Math.round(avg * 0.95),
      convergence_index: _convergenceIndex(domains),
      pressure_index: Math.round((100 - avg) * 0.6 + (Math.max(...Object.values(domains).map((d) => d.risk_score ?? 0)) || 0) * 0.4),
      strategic_oee: domains.production?.strategic_oee ?? null,
      sustainability_trend: domains.environmental?.esg_score ?? null,
      people_stability: domains.hr?.stability ?? null
    }
  };
}

function _extractDomainHealth(runtime, key) {
  if (!runtime?.consolidation_applied) {
    return { domain: key, health_score: null, risk_score: 0, stable: null, present: false };
  }
  const health = runtime[`${key}_cognitive_health`] || runtime.cockpit_cognitive_health || runtime.production_cognitive_health || runtime.environmental_cognitive_health || runtime.maintenance_cognitive_health || runtime.hr_cognitive_health || runtime.safety_cognitive_health;
  const usefulness = health?.usefulness ?? health?.score ?? 0.75;
  return {
    domain: key,
    present: true,
    health_score: Math.round((usefulness || 0.75) * 100),
    risk_score: health?.risk_score ?? health?.compliance_risk ?? 20,
    stable: health?.telemetry_ready !== false,
    strategic_oee: key === 'production' ? runtime.strategic_oee ?? 78 : undefined,
    esg_score: key === 'environmental' ? runtime.esg_score ?? null : undefined,
    stability: key === 'hr' ? health?.stability_index ?? 80 : undefined,
    availability: key === 'maintenance' ? health?.telemetry_ready ?? null : undefined
  };
}

function _convergenceIndex(domains) {
  const present = Object.values(domains).filter((d) => d.present);
  if (present.length < 2) return 0.5;
  const scores = present.map((d) => d.health_score ?? 70);
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round((1 - Math.min(spread / 50, 1)) * 100) / 100;
}

module.exports = { consolidateEnterpriseSignals };
