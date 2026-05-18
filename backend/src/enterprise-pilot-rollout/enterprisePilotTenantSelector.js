'use strict';

const complexity = require('./tenantOperationalComplexityScoring');
const classifier = require('./tenantReadinessClassifier');

/**
 * Selecção de tenants piloto — sem auto-promoção.
 * @param {Array<object>} candidates — { tenant_id, active_users, plant_count, licensed_modules, shadow_pack }
 */
function selectPilotTenants(candidates = [], opts = {}) {
  const maxPilots = Number(opts.max_pilots) || 5;
  const rows = [];

  for (const c of candidates) {
    const comp = complexity.scoreOperationalComplexity(c);
    const shadow = c.shadow_pack || {};
    const classification = classifier.classifyTenantReadiness({
      complexity_score: comp.score,
      operational_score: shadow.tenant_pilot_readiness?.operational_score ?? c.operational_score ?? 0,
      publication_stable: shadow.multi_domain_publication?.publication_stable,
      friction_acceptable: shadow.friction?.acceptable,
      cognitive_overload: shadow.cognitive_maturity?.saturation_analysis?.cognitive
    });
    rows.push({
      tenant_id: c.tenant_id,
      complexity: comp,
      classification,
      recommended: classification.pilot_eligible
    });
  }

  const selected = rows
    .filter((r) => r.recommended)
    .sort((a, b) => {
      const order = { INDUSTRIAL_READY: 4, ADVANCED: 3, MODERATE: 2, LOW: 1 };
      return (order[b.classification.level] || 0) - (order[a.classification.level] || 0);
    })
    .slice(0, maxPilots);

  return {
    ok: true,
    assistive_only: true,
    auto_promotion: false,
    evaluated: rows.length,
    selected,
    rejected_count: rows.length - selected.length
  };
}

module.exports = { selectPilotTenants };
