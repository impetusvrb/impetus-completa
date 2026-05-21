'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');
const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');
const { TIER_MIN } = require('../kpiGracefulPreservation/minimumOperationalKpiSet');

const OP_DOMAINS = ['operations', 'general', 'shared', 'quality', 'safety'];

function ensureOperationalKpiMinimums(kpis = [], original = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'operational').toLowerCase();
  const min = TIER_MIN[tier] ?? 4;
  if (kpis.length >= min) return { kpis, restored: [], minimum_met: true };
  const keys = new Set(kpis.map(kpiKey));
  const restored = [];
  for (const k of original) {
    if (kpis.length + restored.length >= min) break;
    const d = inferKpiDomain(k);
    if (!OP_DOMAINS.includes(d) && d !== String(ctx.domain_axis || '').toLowerCase()) continue;
    if (!keys.has(kpiKey(k))) {
      restored.push(k);
      keys.add(kpiKey(k));
    }
  }
  return { kpis: [...kpis, ...restored], restored, minimum_met: kpis.length + restored.length >= min, fabricated: false };
}

module.exports = { ensureOperationalKpiMinimums };
