'use strict';

/**
 * Pipeline event-driven IMPETUS — composição:
 *
 *   EVENTO → EVENT BUS → EVENT PROCESSOR → GEMINI (refinement) → ORQUESTRADOR (Node)
 *           → [CHATGPT | CLAUDE | AÇÃO]
 *
 * Tudo aditivo: nenhum require deste módulo é feito em rotas existentes.
 * Activação: `IMPETUS_EVENT_PIPELINE_ENABLED=true` controla o `bootEventPipeline`,
 * mas as funções continuam utilizáveis directamente (testes, scripts).
 */

const { createEvent, validateEvent } = require('./envelope');
const { getEventBus } = require('./eventBus');
const { processEvent } = require('./processor/eventProcessor');
const { refineIntent } = require('./intent/intentRefinementService');
const { routeRefinedEvent, wireOrchestrator } = require('./orchestrator/eventOrchestrator');
const { audit } = require('./audit/eventAuditLogger');

let _booted = false;

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
    bus.subscribe(type, async (event) => {
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
            await routeRefinedEvent(processed, refined);
          }
          return;
        }
        const refined = await refineIntent(processed);
        await routeRefinedEvent(processed, refined);
      } catch (err) {
        console.warn('[EVENT_PIPELINE_ERROR]', { type, err: err && err.message });
      }
    });
  }
  _booted = true;
  return { ok: true, types };
}

/**
 * Caminho explícito (sem bus) — útil para chamadas síncronas internas e testes.
 *
 * @param {object} input — campos parciais do envelope (ver envelope.js)
 * @returns {Promise<{ event: object, processed: object, refined: object|null, route: object|null }>}
 */
async function processAndRouteEvent(input) {
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

/** Publica evento no bus (validação reforçada). */
async function publishEvent(input) {
  const event = createEvent(input);
  const bus = getEventBus();
  await bus.publish(event);
  return event;
}

module.exports = {
  bootEventPipeline,
  processAndRouteEvent,
  publishEvent,
  validateEvent
};
