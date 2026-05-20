'use strict';

const { HIERARCHY_BANDS } = require('./kpiDomainRegistry');

function inferHierarchyBand(user, ctx = {}) {
  const explicit = ctx.hierarchy_band || user?.hierarchy_band;
  if (explicit && HIERARCHY_BANDS.includes(explicit)) return explicit;
  const role = String(user?.role || '').toLowerCase();
  if (/exec|ceo|diretor.?geral/.test(role)) return 'executive';
  if (/director|diretor/.test(role)) return 'director';
  if (/coordinator|coordenador/.test(role)) return 'coordinator';
  if (/supervisor|lider/.test(role)) return 'supervisor';
  if (/operator|operador|operário/.test(role)) return 'operator';
  return ctx.default_band || 'staff';
}

function validateHierarchyKpis(user, kpiPayload, ctx = {}) {
  const band = inferHierarchyBand(user, ctx);
  const kpis = require('./kpiTargetingValidator').extractKpiList(kpiPayload);
  const issues = [];
  const bandRank = HIERARCHY_BANDS.indexOf(band);

  for (const k of kpis) {
    const minBand = k.min_hierarchy || k.hierarchy_min;
    const maxBand = k.max_hierarchy || k.hierarchy_max;
    if (minBand && HIERARCHY_BANDS.indexOf(minBand) > bandRank) {
      issues.push({ type: 'hierarchy_too_high', kpi_id: k.id || k.key, minBand, user_band: band, severity: 'high' });
    }
    if (maxBand && HIERARCHY_BANDS.indexOf(maxBand) < bandRank) {
      issues.push({ type: 'hierarchy_too_low', kpi_id: k.id || k.key, maxBand, user_band: band, severity: 'medium' });
    }
    if (k.executive_only && !['executive', 'director'].includes(band)) {
      issues.push({ type: 'executive_kpi_leakage', kpi_id: k.id || k.key, severity: 'critical' });
    }
  }

  const integrity = kpis.length ? 1 - issues.length / Math.max(kpis.length, 1) : 1;
  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    hierarchy_band: band,
    hierarchy_accuracy: Number(Math.max(0, integrity).toFixed(4)),
    issues
  };
}

module.exports = { validateHierarchyKpis, inferHierarchyBand };
