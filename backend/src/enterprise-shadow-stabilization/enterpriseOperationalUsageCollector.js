'use strict';

const behavior = require('../runtime-validation/enterpriseOperationalBehaviorEngine');
const { resolveEnterpriseBand } = require('../runtime-validation/enterpriseRuntimeProfiles');

const MAX = 1000;
const _events = [];

function collectUsageEvent(evt) {
  const row = behavior.recordOperationalEvent({
    ...evt,
    audience_band: evt.audience_band || resolveEnterpriseBand({ role: evt.role, functional_area: evt.functional_area })
  });
  _events.unshift({
    ...row,
    domain: evt.domain || 'enterprise',
    ignored_menu: !!evt.ignored_menu,
    loop_detected: !!evt.loop_detected,
    operational_ms: Number(evt.operational_ms) || Number(evt.operational_completion_ms) || 0
  });
  if (_events.length > MAX) _events.length = MAX;
  return row;
}

function summarizeUsage(tenantId) {
  const summary = behavior.summarizeOperationalBehavior(tenantId);
  const samples = tenantId
    ? _events.filter((e) => !tenantId || String(e.tenant_id || '') === String(tenantId))
    : _events;
  let loops = 0;
  let ignored = 0;
  let opMsSum = 0;
  const byDomain = {};
  for (const s of samples) {
    if (s.loop_detected) loops += 1;
    if (s.ignored_menu) ignored += 1;
    opMsSum += s.operational_ms || 0;
    const d = s.domain || 'enterprise';
    byDomain[d] = (byDomain[d] || 0) + 1;
  }
  const n = samples.length || summary.sample_count || 0;
  return {
    ok: true,
    sample_count: n,
    behavior_summary: summary,
    usage: {
      abandonment_rate: summary.aggregates?.route_abandonment_rate ?? 0,
      repetition_total: summary.aggregates?.repetitive_actions_total ?? 0,
      navigation_loops: loops,
      avg_operational_ms: n ? opMsSum / n : 0,
      ignored_menu_hits: ignored,
      by_domain: byDomain
    }
  };
}

module.exports = { collectUsageEvent, summarizeUsage };
