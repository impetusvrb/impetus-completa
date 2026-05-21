'use strict';

const { inferKpiDomain, FORBIDDEN_CROSS_DOMAIN } = require('../kpiRollout/kpiDomainRegistry');

function simulateKpiVisibility(kpis = [], ctx = {}) {
  const axis = String(ctx.domain_axis || ctx.functional_axis || 'general').toLowerCase();
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  const would_hide = [];
  const would_preserve = [];

  for (const k of kpis) {
    const key = String(k.id || k.key || k.name || '').toLowerCase();
    const domain = inferKpiDomain(k);
    const forbidden = FORBIDDEN_CROSS_DOMAIN[domain] || [];
    const crossLeak = forbidden.includes(axis) || (domain !== axis && domain !== 'general' && domain !== 'shared');
    const execLeak = tier === 'operational' && domain === 'executive';
    const hide = crossLeak || execLeak;

    if (hide) would_hide.push({ kpi_id: key, domain, reason: execLeak ? 'executive_leakage' : 'cross_domain' });
    else would_preserve.push({ kpi_id: key, domain });
  }

  return {
    simulation_only: true,
    enforcement_applied: false,
    would_hide,
    would_preserve,
    hide_count: would_hide.length,
    preserve_count: would_preserve.length
  };
}

module.exports = { simulateKpiVisibility };
