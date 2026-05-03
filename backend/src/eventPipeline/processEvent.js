'use strict';

/**
 * Wrapper canónico do pipeline event-driven, devolvendo a forma padronizada
 * usada pela camada cognitiva (overlay):
 *
 *   {
 *     traceId: string,
 *     intent: 'conversation'|'analysis'|'task'|'external_data'|'system_health',
 *     summary: string,
 *     entities: string[],
 *     confidence: number,
 *     metadata: { source: 'event_pipeline', timestamp: number, ... }
 *   }
 *
 * Não substitui `processor/eventProcessor.js`. Esse módulo continua disponível
 * com a sua forma original para os testes e quem o consome directamente. Este
 * wrapper compõe o fluxo `processor → intent refinement` e devolve o snapshot
 * achatado, sem efeitos colaterais (não publica no bus, não chama acções).
 */

const { v4: uuidv4 } = require('uuid');
const { processEvent: rawProcessEvent } = require('./processor/eventProcessor');
const { refineIntent } = require('./intent/intentRefinementService');

function generateTraceId() {
  return uuidv4();
}

function _coerceText(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'object') {
    if (typeof input.text === 'string') return input.text;
    if (typeof input.message === 'string') return input.message;
    if (typeof input.content === 'string') return input.content;
  }
  return '';
}

function _envelopeFromInput(input, context) {
  const userId = context && context.userId != null ? String(context.userId) : null;
  const text = _coerceText(input);
  return {
    id: uuidv4(),
    type: 'chat_message',
    source: 'system',
    user: userId,
    payload: { text },
    priority: (context && context.priority) || 'medium',
    timestamp: new Date().toISOString()
  };
}

/**
 * @param {string|object} input  — texto ou objecto contendo `{ text|message|content }`
 * @param {{ traceId?: string, userId?: string, priority?: string }} [context]
 * @returns {Promise<{
 *   traceId: string,
 *   intent: string,
 *   summary: string,
 *   entities: string[],
 *   confidence: number,
 *   metadata: object
 * }>}
 */
async function processEvent(input, context) {
  const traceId = (context && context.traceId) || generateTraceId();
  const ctx = context && typeof context === 'object' ? context : {};

  const envelope = _envelopeFromInput(input, ctx);
  const processed = rawProcessEvent(envelope);

  if (processed.filtered) {
    return {
      traceId,
      intent: processed.intent_pre,
      summary: processed.summary || '',
      entities: processed.entities || [],
      confidence: 0,
      metadata: {
        source: 'event_pipeline',
        timestamp: Date.now(),
        filtered: true,
        reason: processed.reason || null,
        event_id: processed.event_id,
        event_type: processed.event_type
      }
    };
  }

  let refined = null;
  try {
    refined = await refineIntent(processed);
  } catch (err) {
    console.warn('[PROCESS_EVENT_REFINE_FAIL]', { traceId, err: err && err.message });
    refined = null;
  }

  const intent = (refined && refined.intent) || processed.intent_pre;
  const summary = processed.summary || '';
  const entities = (refined && Array.isArray(refined.entities) ? refined.entities : null) || processed.entities || [];
  const confidence =
    refined && Number.isFinite(refined.confidence) ? refined.confidence : 0.7;

  return {
    traceId,
    intent,
    summary,
    entities,
    confidence,
    metadata: {
      source: 'event_pipeline',
      timestamp: Date.now(),
      filtered: false,
      event_id: processed.event_id,
      event_type: processed.event_type,
      refined_by: refined && refined.refined_by ? refined.refined_by : 'fallback',
      priority: (refined && refined.priority) || processed.priority,
      requires_ai: processed.requires_ai
    }
  };
}

module.exports = processEvent;
module.exports.processEvent = processEvent;
module.exports.generateTraceId = generateTraceId;
