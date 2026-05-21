'use strict';

function balanceExecutiveOperationalKpis(kpis = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier || ctx.hierarchy_tier;
  const level = ctx.canonical_identity?.hierarchy_level ?? 3;
  if (tier !== 'executive' && level > 2) {
    return { kpis, balanced: false, reason: 'not_executive' };
  }
  const executiveKeys = new Set(['faturamento', 'lucro', 'oee', 'eficiencia', 'desperdicio', 'custo']);
  const operational = [];
  const executive = [];
  for (const k of kpis) {
    const key = String(k.id || k.key || k.label || '').toLowerCase();
    if (executiveKeys.has(key) || /faturamento|lucro|oee/i.test(key)) executive.push(k);
    else operational.push(k);
  }
  return {
    kpis: tier === 'executive' ? [...executive, ...operational.slice(0, 2)] : kpis,
    executive_count: executive.length,
    operational_trimmed: tier === 'executive',
    balanced: true
  };
}

module.exports = { balanceExecutiveOperationalKpis };
