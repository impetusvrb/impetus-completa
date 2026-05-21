'use strict';

function assessCockpitGovernanceConsistency(payload = {}, ctx = {}) {
  const domain = ctx.domain_axis || payload.functional_axis;
  const tier = ctx.hierarchy_tier || 'coordination';
  const bleed = [];

  const kpis = payload.kpis || [];
  for (const k of kpis) {
    const label = String(k.label || k.key || k.id || '').toLowerCase();
    if ((tier === 'coordination' || tier === 'operational') && /faturamento|lucro|oee/i.test(label)) {
      bleed.push({ type: 'kpi', id: label, reason: 'executive_metric_on_operational_cockpit' });
    }
  }

  if (payload.engine_v2) {
    const e2 = payload.engine_v2;
    if (tier !== 'operational' && e2.centro_operacoes) {
      bleed.push({ type: 'cockpit', block: 'centro_operacoes', reason: 'operational_cockpit_bleed' });
    }
  }

  const insights = payload.insights || payload.engine_v2?.insights || [];
  if (insights.length && domain === 'quality') {
    const bad = insights.filter((i) => /sst|ambiental|faturamento/i.test(String(i.title || i.summary || '')));
    if (bad.length) bleed.push({ type: 'insights', count: bad.length, reason: 'cross_domain_insights' });
  }

  return {
    cockpit_consistent: bleed.length === 0,
    cross_domain_bleed: bleed,
    domain_axis: domain,
    hierarchy_tier: tier,
    widgets_governed: true,
    telemetry_governed: true
  };
}

module.exports = { assessCockpitGovernanceConsistency };
