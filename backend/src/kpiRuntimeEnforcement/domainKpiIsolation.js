'use strict';

const { inferKpiDomain, FORBIDDEN_CROSS_DOMAIN, normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function kpiKey(k) {
  return String(k?.id || k?.key || k?.name || '').toLowerCase();
}

function isolateDomainKpis(kpis = [], ctx = {}) {
  const axis = normalizeAxis(ctx.domain_axis || ctx.functional_axis || 'general');
  const kept = [];
  const removed = [];

  for (const k of kpis) {
    const domain = inferKpiDomain(k);
    const forbidden = FORBIDDEN_CROSS_DOMAIN[domain] || [];
    const cross =
      forbidden.includes(axis) ||
      (domain !== axis && domain !== 'general' && domain !== 'shared');
    if (cross) removed.push({ kpi_id: kpiKey(k), domain, reason: 'cross_domain' });
    else kept.push(k);
  }

  return { kpis: kept, removed, axis };
}

module.exports = { isolateDomainKpis, kpiKey };
