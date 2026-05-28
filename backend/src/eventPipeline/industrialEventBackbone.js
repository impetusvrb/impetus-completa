'use strict';

/**
 * Orquestrador WAVE 1 — publicação industrial governada (shadow-first, flag-gated).
 */

const { buildIndustrialEnvelope, fromLegacyEnvelope } = require('./industrialEnvelope');
const { validateCatalogType, getCatalogSnapshot } = require('./catalog/industrialEventCatalog');
const {
  isIndustrialEventsEnabled,
  isIndustrialOutboxEnabled,
  isEventCatalogStrict,
  industrialBackboneMode,
  isIndustrialBackboneActive
} = require('./industrialFlags');
const outbox = require('./outbox/industrialOutboxService');
const { checkPublishBackpressure } = require('./backpressure/backpressureController');
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
  const backpressure = await checkPublishBackpressure({
    company_id: envelope.company_id,
    domain: envelope.domain,
    event_name: envelope.event_name
  });

  if (!backpressure.allowed) {
    _throttle_blocked += 1;
    return {
      ok: false,
      reason: backpressure.reason || 'backpressure',
      backpressure,
      throttle: backpressure.tenant
    };
  }
  const throttle = backpressure.tenant;

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
  let wave2 = {};
  try {
    const recovery = require('./recovery/streamRecoveryWorker');
    const archive = require('./archive/industrialArchiveService');
    const bp = require('./backpressure/backpressureController');
    const orch = require('./replay/industrialReplayOrchestrator');
    const sched = require('./scheduler/industrialBackboneScheduler');
    wave2 = {
      backbone_mode: industrialBackboneMode(),
      recovery: recovery.getRecoveryStats(),
      archive: archive.getArchiveStats(),
      backpressure: bp.getBackpressureStats(),
      replay_orchestrator: orch.getOrchestratorStats(),
      scheduler_running: sched.isSchedulerRunning()
    };
  } catch (_e) {}

  return {
    enabled: isIndustrialEventsEnabled(),
    outbox_enabled: isIndustrialOutboxEnabled(),
    catalog_strict: isEventCatalogStrict(),
    backbone_mode: industrialBackboneMode(),
    backbone_active: isIndustrialBackboneActive(),
    published: _published,
    rejected: _rejected,
    throttle_blocked: _throttle_blocked,
    catalog: getCatalogSnapshot(),
    outbox: outbox.getOutboxStats(),
    dlq: dlq.getDlqStats(),
    replay: replay.getReplayStats(),
    throttle: require('./throttling/tenantThrottleService').getThrottleStats(),
    summarization: summarization.getSummarizationStats(),
    wave2
  };
}

/**
 * Boot WAVE 2 — recovery + scheduler opt-in (não bloqueia server).
 */
async function bootIndustrialEventBackbone() {
  const result = {
    mode: industrialBackboneMode(),
    recovery: null,
    scheduler: null
  };
  if (!isIndustrialEventsEnabled() || !isIndustrialBackboneActive()) {
    return { ok: true, skipped: true, ...result };
  }
  try {
    const recovery = require('./recovery/streamRecoveryWorker');
    result.recovery = await recovery.runStreamRecovery({ limit: 500 });
  } catch (e) {
    result.recovery = { ok: false, error: e?.message };
  }
  try {
    const sched = require('./scheduler/industrialBackboneScheduler');
    result.scheduler = sched.startScheduler();
  } catch (e) {
    result.scheduler = { started: false, error: e?.message };
  }
  return { ok: true, ...result };
}

module.exports = {
  publishIndustrialEvent,
  publishIndustrialEventDeferred,
  mirrorLegacyEventToIndustrial,
  getIndustrialBackboneHealth,
  bootIndustrialEventBackbone,
  validateCatalogType,
  buildIndustrialEnvelope
};
