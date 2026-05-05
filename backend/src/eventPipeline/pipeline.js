'use strict';

/**
 * Pipeline event-driven IMPETUS — composição:
 *
 *   EVENTO → EVENT BUS → EVENT PROCESSOR → GEMINI (refinement) → ORQUESTRADOR (Node)
 *           → [CHATGPT | CLAUDE | AÇÃO]
 *
 * Modo shadow (IMPETUS_EVENT_PIPELINE_SHADOW=true): sem Gemini nos refinamentos,
 * handlers NOOP no bootstrap, métricas EVENT_PIPELINE_SHADOW, sem auditoria DB/stdout canónica.
 */

const { createEvent, validateEvent } = require('./envelope');
const { getEventBus } = require('./eventBus');
const { processEvent } = require('./processor/eventProcessor');
const { refineIntent } = require('./intent/intentRefinementService');
const { routeRefinedEvent, wireOrchestrator } = require('./orchestrator/eventOrchestrator');
const { audit } = require('./audit/eventAuditLogger');

let _booted = false;

function _pipelineTimeoutMs() {
  const n = Number(process.env.IMPETUS_EVENT_PIPELINE_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), 120000);
  return 6000;
}

function _shadowMetricsOn() {
  if (process.env.IMPETUS_EVENT_PIPELINE_SHADOW !== 'true') return false;
  const v = String(process.env.IMPETUS_EVENT_PIPELINE_METRICS_LOG ?? 'true')
    .trim()
    .toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function _logShadowMetric(obj) {
  if (!_shadowMetricsOn()) return;
  try {
    console.info('[EVENT_PIPELINE_SHADOW]', JSON.stringify(Object.assign({ event: 'EVENT_PIPELINE_SHADOW' }, obj)));
  } catch (_e) {}
}

function _logShadowErr(obj) {
  if (process.env.IMPETUS_EVENT_PIPELINE_SHADOW !== 'true') return;
  try {
    console.warn(
      '[EVENT_PIPELINE_SHADOW_ERROR]',
      JSON.stringify(Object.assign({ event: 'EVENT_PIPELINE_SHADOW_ERROR' }, obj))
    );
  } catch (_e) {
    console.warn('[EVENT_PIPELINE_SHADOW_ERROR]', obj);
  }
}

function _extractShadowIds(event) {
  const company_id =
    event && event.payload && event.payload.company_id != null ? event.payload.company_id : null;
  const user_id = event && event.user != null ? event.user : null;
  return { company_id, user_id };
}

/**
 * @param {object} event — envelope
 * @param {object} processed
 * @param {object|null} refined
 * @param {object|null} route
 * @param {number} latency_ms
 */
function _emitShadowSuccess(event, processed, refined, route, latency_ms) {
  const { company_id, user_id } = _extractShadowIds(event);
  const intent =
    refined && refined.intent != null
      ? refined.intent
      : processed && processed.intent_pre != null
        ? processed.intent_pre
        : null;
  const confidence = refined && typeof refined.confidence === 'number' ? refined.confidence : null;
  const routeCh = route && route.channel != null ? route.channel : null;
  _logShadowMetric({
    company_id,
    user_id,
    intent,
    route: routeCh,
    confidence,
    latency_ms,
    timestamp: new Date().toISOString()
  });
}

async function _onBusEvent(type, event) {
  const t0 = Date.now();
  const { company_id, user_id } = _extractShadowIds(event);
  try {
    const processed = processEvent(event);
    if (processed.filtered || processed.requires_ai === false) {
      if (processed.filtered) {
        console.info('[EVENT_FILTERED]', { event_id: processed.event_id, reason: processed.reason });
      }
      if (processed.requires_ai === false && !processed.filtered) {
        const refined = {
          intent: processed.intent_pre,
          confidence: 0.5,
          entities: processed.entities,
          priority: processed.priority,
          refined_by: 'fallback'
        };
        const route = await routeRefinedEvent(processed, refined);
        try {
          await audit({
            event_id: processed.event_id,
            event_type: processed.event_type,
            intent_pre: processed.intent_pre,
            intent_refined: refined.intent,
            ia_chamada: refined.refined_by === 'gemini' ? 'gemini' : 'none',
            route_channel: route ? route.channel : null,
            ok: !!(route && route.ok),
            summary: processed.summary,
            meta: { priority: processed.priority, confidence: refined.confidence, bus: true }
          });
        } catch (_auditErr) {
          /* não derrubar o bus */
        }
        _emitShadowSuccess(event, processed, refined, route, Date.now() - t0);
      } else if (processed.filtered) {
        try {
          await audit({
            event_id: processed.event_id,
            event_type: processed.event_type,
            intent_pre: processed.intent_pre,
            intent_refined: 'filtered',
            ia_chamada: 'none',
            route_channel: 'filtered',
            ok: false,
            summary: processed.summary,
            meta: { reason: processed.reason || 'noise', bus: true }
          });
        } catch (_auditErr) {}
        _emitShadowSuccess(event, processed, { intent: 'filtered', confidence: null }, { channel: 'filtered' }, Date.now() - t0);
      }
      return;
    }
    const refined = await refineIntent(processed);
    const route = await routeRefinedEvent(processed, refined);
    try {
      await audit({
        event_id: processed.event_id,
        event_type: processed.event_type,
        intent_pre: processed.intent_pre,
        intent_refined: refined.intent,
        ia_chamada: refined.refined_by === 'gemini' ? 'gemini' : 'none',
        route_channel: route ? route.channel : null,
        ok: !!(route && route.ok),
        summary: processed.summary,
        meta: { priority: refined.priority, confidence: refined.confidence, bus: true }
      });
    } catch (_auditErr) {}
    _emitShadowSuccess(event, processed, refined, route, Date.now() - t0);
  } catch (err) {
    console.warn('[EVENT_PIPELINE_ERROR]', { type, err: err && err.message });
    _logShadowErr({
      error: err && err.message ? String(err.message) : String(err),
      company_id,
      user_id,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Liga o pipeline aos handlers reais (acções) e regista subscritores no bus.
 * Idempotente.
 *
 * @param {{
 *   handlers?: object,
 *   types?: string[]
 * }} [opts]
 */
function bootEventPipeline(opts = {}) {
  if (_booted) return { ok: true, already_booted: true };
  if (process.env.IMPETUS_EVENT_PIPELINE_ENABLED !== 'true') {
    return { ok: false, reason: 'disabled_by_env' };
  }
  if (opts.handlers) wireOrchestrator(opts.handlers);
  const bus = getEventBus();
  const types = Array.isArray(opts.types) && opts.types.length
    ? opts.types
    : ['chat_message', 'sensor_alert', 'task_update', 'external_data', 'system_health_snapshot'];

  for (const type of types) {
    bus.subscribe(type, (event) => _onBusEvent(type, event));
  }
  _booted = true;
  return { ok: true, types };
}

async function _processAndRouteEventCore(input) {
  const event = createEvent(input);
  const processed = processEvent(event);
  if (processed.filtered) {
    return { event, processed, refined: null, route: null };
  }
  if (!processed.requires_ai) {
    const refined = {
      intent: processed.intent_pre,
      confidence: 0.5,
      entities: processed.entities,
      priority: processed.priority,
      refined_by: 'fallback'
    };
    const route = await routeRefinedEvent(processed, refined);
    await audit({
      event_id: processed.event_id,
      event_type: processed.event_type,
      intent_pre: processed.intent_pre,
      intent_refined: refined.intent,
      ia_chamada: refined.refined_by === 'gemini' ? 'gemini' : 'none',
      route_channel: route ? route.channel : null,
      ok: !!(route && route.ok),
      summary: processed.summary,
      meta: { priority: processed.priority, confidence: refined.confidence }
    });
    return { event, processed, refined, route };
  }
  const refined = await refineIntent(processed);
  const route = await routeRefinedEvent(processed, refined);
  await audit({
    event_id: processed.event_id,
    event_type: processed.event_type,
    intent_pre: processed.intent_pre,
    intent_refined: refined.intent,
    ia_chamada: refined.refined_by === 'gemini' ? 'gemini' : 'none',
    route_channel: route ? route.channel : null,
    ok: !!(route && route.ok),
    summary: processed.summary,
    meta: { priority: refined.priority, confidence: refined.confidence }
  });
  return { event, processed, refined, route };
}

/**
 * Caminho explícito (sem bus) — útil para chamadas síncronas internas e testes.
 * Protegido por timeout (IMPETUS_EVENT_PIPELINE_TIMEOUT_MS).
 *
 * @param {object} input — campos parciais do envelope (ver envelope.js)
 * @returns {Promise<{ event: object, processed: object, refined: object|null, route: object|null }>}
 */
async function processAndRouteEvent(input) {
  const ms = _pipelineTimeoutMs();
  return Promise.race([
    _processAndRouteEventCore(input),
    new Promise((_, reject) => {
      const t = setTimeout(() => {
        const e = new Error(`EVENT_PIPELINE_TIMEOUT_${ms}ms`);
        e.code = 'EVENT_PIPELINE_TIMEOUT';
        reject(e);
      }, ms);
      if (typeof t.unref === 'function') t.unref();
    })
  ]);
}

/** Publica evento no bus (validação reforçada). */
async function publishEvent(input) {
  const event = createEvent(input);
  const bus = getEventBus();
  await bus.publish(event);
  return event;
}

/**
 * Publicação fora do ciclo de pedido HTTP: não bloqueia a thread de resposta.
 * Erros capturados — nunca rejeitam o chamador.
 */
function publishEventDeferred(input) {
  setImmediate(() => {
    publishEvent(input).catch((err) => {
      const meta = (input && input.payload) || {};
      _logShadowErr({
        error: err && err.message ? String(err.message) : String(err),
        company_id: meta.company_id != null ? meta.company_id : null,
        user_id: input && input.user != null ? input.user : null,
        timestamp: new Date().toISOString()
      });
      console.warn('[EVENT_PIPELINE_PUBLISH_DEFERRED_FAIL]', err && err.message ? err.message : err);
    });
  });
}

module.exports = {
  bootEventPipeline,
  processAndRouteEvent,
  publishEvent,
  publishEventDeferred,
  validateEvent
};
