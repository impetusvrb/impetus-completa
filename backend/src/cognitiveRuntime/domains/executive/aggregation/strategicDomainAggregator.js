'use strict';

function aggregateStrategicDomains(enterpriseBundle = {}) {
  const ent = enterpriseBundle.enterprise || {};
  const domains = enterpriseBundle.domains || {};
  return {
    production_stability: domains.production?.stable !== false ? 'stable' : 'watch',
    quality_reliability: (domains.quality?.health_score ?? 75) >= 70 ? 'reliable' : 'degraded',
    safety_governance: (domains.safety?.risk_score ?? 15) < 40 ? 'controlled' : 'elevated',
    people_health: (domains.hr?.health_score ?? 78) >= 65 ? 'healthy' : 'pressure',
    environmental_risk: (domains.environmental?.risk_score ?? 20) < 50 ? 'low' : 'elevated',
    strategic_oee_trend: ent.strategic_oee != null ? ent.strategic_oee : 76,
    convergence: ent.convergence_index ?? 0.7,
    maturity: ent.maturity_index ?? 72
  };
}

module.exports = { aggregateStrategicDomains };
