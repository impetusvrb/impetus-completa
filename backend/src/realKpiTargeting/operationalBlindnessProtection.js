'use strict';

function protectOperationalKpiBlindness(kpis = [], before = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier;
  if (tier === 'executive' && kpis.length === 0 && before.length > 0) {
    return {
      kpis: before.slice(0, Math.min(3, before.length)),
      blindness_protected: true,
      reason: 'executive_empty_restore'
    };
  }
  if (kpis.length === 0 && before.length > 0) {
    return {
      kpis: before.filter((k) => {
        const key = String(k.id || k.key || '').toLowerCase();
        return !/faturamento|lucro|oee|eficiencia global/i.test(key);
      }).slice(0, 4),
      blindness_protected: true,
      reason: 'operational_minimum_restore'
    };
  }
  return { kpis, blindness_protected: false };
}

module.exports = { protectOperationalKpiBlindness };
