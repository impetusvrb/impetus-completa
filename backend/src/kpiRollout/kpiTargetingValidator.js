'use strict';

const { normalizeAxis, inferKpiDomain } = require('./kpiDomainRegistry');

function extractKpiList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.kpis || payload?.items || [];
}

function validateKpiTargeting(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  const role = String(user?.role || ctx.role || '').toLowerCase();
  const issues = [];
  let aligned = 0;

  for (const k of kpis) {
    const kDomain = inferKpiDomain(k);
    const targetAxis = normalizeAxis(k.target_axis || k.allowed_axis || userAxis);
    if (kDomain === userAxis || kDomain === 'general' || kDomain === 'shared') {
      aligned++;
    } else if (targetAxis !== userAxis) {
      issues.push({
        type: 'targeting_mismatch',
        kpi_id: k.id || k.key,
        kpi_domain: kDomain,
        user_axis: userAxis,
        severity: 'high'
      });
    }
    if (role.includes('operator') && kDomain === 'executive') {
      issues.push({ type: 'executive_leakage', kpi_id: k.id || k.key, severity: 'critical' });
    }
  }

  const precision = kpis.length ? aligned / kpis.length : 1;
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    targeting_precision: Number(precision.toFixed(4)),
    aligned_count: aligned,
    kpi_count: kpis.length,
    issues
  };
}

module.exports = { validateKpiTargeting, extractKpiList };
