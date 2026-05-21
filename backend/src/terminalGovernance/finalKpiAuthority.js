'use strict';

const { kpiKey } = require('../runtimeDeliveryAudit/kpiDeliveryTrace');

const EXECUTIVE_KPI_PATTERN = /faturamento|lucro|revenue|profit|oee\b|oee\s*%|oee\s*global|desperd[ií]cio|efici[eê]ncia\s*(global|%|geral)|custo\s*industrial|ebitda|margem\s*(l[ií]quida|bruta|%)|score\s*corporativo|esg\s*estrat[eé]gico/i;

function isExecutiveKpi(kpi) {
  const key = kpiKey(kpi);
  return EXECUTIVE_KPI_PATTERN.test(key) || kpi.executive_only === true || kpi.domain === 'executive';
}

function resolveFinalKpiAuthority(kpis = [], ctx = {}) {
  const tier = ctx.hierarchy_tier || ctx.canonical_identity?.hierarchy_tier;
  const domain = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const original = ctx.original_kpis || kpis;
  const originalKeys = new Set(original.map(kpiKey));

  const kept = [];
  const removed = [];
  const restored = [];

  for (const k of kpis) {
    const key = kpiKey(k);
    if (tier !== 'executive' && tier !== 'direction' && isExecutiveKpi(k)) {
      removed.push({ kpi_id: key, reason: 'executive_kpi_on_non_executive' });
      continue;
    }
    if (k.domain && k.domain !== domain && domain !== 'unknown') {
      removed.push({ kpi_id: key, reason: 'cross_domain_kpi' });
      continue;
    }
    kept.push(k);
  }

  if (kept.length === 0 && original.length > 0) {
    for (const k of original) {
      if (!isExecutiveKpi(k) || tier === 'executive') {
        restored.push(k);
        if (restored.length >= Math.min(3, original.length)) break;
      }
    }
  }

  const finalKpis = kept.length ? kept : restored;
  return {
    final_kpis: finalKpis,
    removed_by_terminal: removed,
    restored_minimal: restored,
    leakage_detected: removed.some((r) => r.reason === 'executive_kpi_on_non_executive'),
    terminal_locked: true
  };
}

module.exports = { resolveFinalKpiAuthority, isExecutiveKpi, EXECUTIVE_KPI_PATTERN };
