'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');
const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

const TIER_MIN = { executive: 2, director: 2, coordination: 3, supervisor: 3, operational: 4, staff: 3 };

function isRestorable(k, ctx = {}) {
  const denied = new Set((ctx.denied_kpi_keys || ctx.removed_kpi_ids || []).map(String));
  const id = kpiKey(k);
  if (denied.has(id)) return false;
  const axis = String(ctx.domain_axis || '').toLowerCase();
  const d = inferKpiDomain(k);
  if (axis && d !== axis && d !== 'general' && d !== 'shared' && d !== 'operations') return false;
  return true;
}

function ensureMinimumOperationalKpis(filtered = [], original = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const min = TIER_MIN[tier] ?? 3;
  if (filtered.length >= min) return { kpis: filtered, restored: [], minimum_met: true };

  const existingKeys = new Set(filtered.map(kpiKey));
  const restored = [];
  const candidates = original.filter((k) => isRestorable(k, ctx));

  for (const k of candidates) {
    if (filtered.length + restored.length >= min) break;
    if (!existingKeys.has(kpiKey(k))) {
      restored.push(k);
      existingKeys.add(kpiKey(k));
    }
  }

  return {
    kpis: [...filtered, ...restored],
    restored,
    minimum_met: filtered.length + restored.length >= min
  };
}

module.exports = { ensureMinimumOperationalKpis, TIER_MIN };
