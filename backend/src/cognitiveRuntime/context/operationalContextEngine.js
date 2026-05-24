'use strict';

const crypto = require('crypto');
const c2 = require('../config/phaseC2FeatureFlags');
const { loadTenantContext, saveTenantContext } = require('./operationalContextStore');

function _eventId() {
  return `evt_${crypto.randomBytes(8).toString('hex')}`;
}

function _extractEventsFromPayload(payload = {}, user = {}) {
  const events = [];
  const ts = new Date().toISOString();
  const companyId = user?.company_id || payload.company_id;

  if (payload.quality_insights?.length) {
    for (const ins of payload.quality_insights.slice(0, 5)) {
      events.push({
        event_id: _eventId(),
        domain: 'quality',
        source_runtime: 'runtime_z',
        event_type: 'quality_insight',
        operational_context: typeof ins === 'string' ? ins : ins.summary || ins.label || JSON.stringify(ins).slice(0, 200),
        causal_chain: [{ step: 'insight_detected', source: 'quality_cockpit', at: ts }],
        related_events: [],
        confidence_score: 0.82,
        historical_similarity: null,
        recurrence_detected: false,
        verification_state: 'pending',
        created_at: ts,
        company_id: companyId
      });
    }
  }

  if (payload.quality_operational_metrics) {
    const m = payload.quality_operational_metrics;
    events.push({
      event_id: _eventId(),
      domain: 'quality',
      source_runtime: 'runtime_z',
      event_type: 'operational_metrics_snapshot',
      operational_context: `Métricas qualidade: NC=${m.open_nc ?? m.nc_open ?? '—'} CAPA=${m.open_capa ?? '—'}`,
      causal_chain: [{ step: 'metrics_ingested', source: 'dashboard_me', at: ts }],
      related_events: [],
      confidence_score: 0.9,
      historical_similarity: null,
      recurrence_detected: false,
      verification_state: 'verified',
      created_at: ts,
      company_id: companyId
    });
  }

  if (payload.production_cognitive_runtime?.consolidation_applied) {
    events.push({
      event_id: _eventId(),
      domain: 'production',
      source_runtime: 'runtime_z',
      event_type: 'production_cockpit_signal',
      operational_context: `Produção consolidada · telemetria ${payload.production_cognitive_runtime.telemetry_readiness || '—'}`,
      causal_chain: [{ step: 'cross_domain_signal', source: 'production_runtime', at: ts }],
      related_events: [],
      confidence_score: 0.75,
      historical_similarity: null,
      recurrence_detected: false,
      verification_state: 'pending',
      created_at: ts,
      company_id: companyId
    });
  }

  if (payload.maintenance_cognitive_runtime?.consolidation_applied) {
    events.push({
      event_id: _eventId(),
      domain: 'maintenance',
      source_runtime: 'runtime_z',
      event_type: 'reliability_signal',
      operational_context: payload.specialized_summary || 'Sinal confiabilidade manutenção',
      causal_chain: [{ step: 'reliability_ingested', source: 'maintenance_runtime', at: ts }],
      related_events: [],
      confidence_score: 0.78,
      historical_similarity: null,
      recurrence_detected: false,
      verification_state: 'pending',
      created_at: ts,
      company_id: companyId
    });
  }

  return events;
}

function appendOperationalContext(user = {}, payload = {}, incomingEvents = []) {
  const tenantId = user?.company_id || payload.company_id || 'default';
  const store = loadTenantContext(tenantId);
  const extracted = _extractEventsFromPayload(payload, user);
  const merged = [...(incomingEvents || []), ...extracted];
  const max = c2.maxTimelineEvents();
  const events = [...store.events, ...merged].slice(-max);
  saveTenantContext(tenantId, { events });
  return { events, new_count: merged.length, total: events.length };
}

function getOperationalTimeline(user = {}, opts = {}) {
  const tenantId = user?.company_id || opts.tenant_id || 'default';
  const store = loadTenantContext(tenantId);
  return store.events || [];
}

function buildOperationalContextRuntime(user = {}, payload = {}, ctx = {}) {
  if (!c2.isOperationalContextEngineEnabled() && !ctx.force_operational_context) {
    return { skipped: true, reason: 'operational_context_off' };
  }

  const synthetic = ctx.synthetic_events || [];
  const { events, new_count, total } = appendOperationalContext(user, payload, synthetic);

  return {
    timeline_event_count: total,
    new_events_appended: new_count,
    events_sample: events.slice(-8),
    cross_session: true,
    causal_ready: total >= 3,
    auto_mutation: false
  };
}

module.exports = {
  appendOperationalContext,
  getOperationalTimeline,
  buildOperationalContextRuntime,
  _extractEventsFromPayload
};
