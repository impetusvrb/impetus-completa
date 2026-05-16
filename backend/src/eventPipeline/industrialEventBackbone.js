'use strict';

/**
 * Orquestrador WAVE 1 — publicação industrial governada (shadow-first, flag-gated).
 */

const { buildIndustrialEnvelope, fromLegacyEnvelope } = require('./industrialEnvelope');
const { validateCatalogType, getCatalogSnapshot } = require('./catalog/industrialEventCatalog');
const {
  isIndustrialEventsEnabled,
  isIndustrialOutboxEnabled,
  isEventCatalogStrict
} = require('./industrialFlags');
const outbox = require('./outbox/industrialOutboxService');
const { checkTenantThrottle } = require('./throttling/tenantThrottleService');
const { invokeSummarizationHooks } = require('./summarization/summarizationHooks');

let _published = 0;
let _rejected = 0;
let _throttle_blocked = 0;

/**
 * @param {object} partial — campos do envelope industrial
 * @param {{ defer?: boolean, legacy_mirror?: boolean }} [opts]
 */
async function publishIndustrialEvent(partial, opts = {}) {
  if (!isIndustrialEventsEnabled()) {
    return { ok: false, reason: 'industrial_events_disabled' };
  }

  let enrichedPartial = partial;
  try {
    const corr = require('../observability/correlationContext');
    const flags = require('../observability/observabilityFlags');
    if (flags.isCorrelationPropagationEnabled()) {
      enrichedPartial = corr.enrichIndustrialEnvelope(partial);
    }
  } catch (_e) {}

  const envelope = buildIndustrialEnvelope(enrichedPartial, { strictCatalog: isEventCatalogStrict() });
  const throttle = checkTenantThrottle(envelope.company_id, {
    domain: envelope.domain,
    event_name: envelope.event_name
  });

  if (!throttle.allowed) {
    _throttle_blocked += 1;
    return { ok: false, reason: 'tenant_throttled', throttle };
  }

  const outboxResult = await outbox.enqueueIndustrialEvent(envelope);
  try {
    const lag = require('../observability/eventLagMonitor');
    const obsFlags = require('../observability/observabilityFlags');
    if (obsFlags.isEventLagMonitoringEnabled()) lag.recordPublishToOutbox(envelope);
  } catch (_e) {}
  await invokeSummarizationHooks(envelope, { trigger: 'publish' }).catch(() => {});

  _published += 1;

  try {
    console.info(
      '[INDUSTRIAL_EVENT_PUBLISHED]',
      JSON.stringify({
        event_name: envelope.event_name,
        company_id: envelope.company_id,
        correlation_id: envelope.correlation_id,
        trace_id: envelope.trace_id,
        outbox_id: outboxResult.id,
        observe_throttle: throttle.would_throttle || false
      })
    );
  } catch (_e) {}

  return {
    ok: true,
    envelope,
    outbox: outboxResult,
    throttle
  };
}

function publishIndustrialEventDeferred(partial) {
  if (!isIndustrialEventsEnabled()) return;
  setImmediate(() => {
    publishIndustrialEvent(partial).catch((err) => {
      _rejected += 1;
      try {
        console.warn(
          '[INDUSTRIAL_EVENT_PUBLISH_FAIL]',
          JSON.stringify({ message: err?.message || String(err) })
        );
      } catch (_e) {}
    });
  });
}

/**
 * Espelha envelope v2 legado para backbone industrial (não bloqueia pipeline).
 * @param {object} legacyEnvelope
 * @param {{ correlation_id?: string, trace_id?: string, event_name?: string }} [ctx]
 */
function mirrorLegacyEventToIndustrial(legacyEnvelope, ctx = {}) {
  if (!isIndustrialEventsEnabled()) return null;
  try {
    const industrial = fromLegacyEnvelope(legacyEnvelope, ctx);
    if (!industrial) return null;
    return publishIndustrialEventDeferred(industrial);
  } catch (err) {
    try {
      console.warn('[INDUSTRIAL_MIRROR_FAIL]', err?.message || err);
    } catch (_e) {}
    return null;
  }
}

function getIndustrialBackboneHealth() {
  const dlq = require('./dlq/industrialDlqService');
  const replay = require('./replay/shadowReplayWorker');
  const summarization = require('./summarization/summarizationHooks');

  return {
    enabled: isIndustrialEventsEnabled(),
    outbox_enabled: isIndustrialOutboxEnabled(),
    catalog_strict: isEventCatalogStrict(),
    published: _published,
    rejected: _rejected,
    throttle_blocked: _throttle_blocked,
    catalog: getCatalogSnapshot(),
    outbox: outbox.getOutboxStats(),
    dlq: dlq.getDlqStats(),
    replay: replay.getReplayStats(),
    throttle: require('./throttling/tenantThrottleService').getThrottleStats(),
    summarization: summarization.getSummarizationStats()
  };
}

module.exports = {
  publishIndustrialEvent,
  publishIndustrialEventDeferred,
  mirrorLegacyEventToIndustrial,
  getIndustrialBackboneHealth,
  validateCatalogType,
  buildIndustrialEnvelope
};
