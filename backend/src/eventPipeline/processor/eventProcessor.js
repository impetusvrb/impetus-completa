'use strict';

/**
 * Event Processor — guardião antes de qualquer IA.
 *
 * Responsabilidades:
 *   1) Filtrar ruído / payloads obviamente irrelevantes
 *   2) Reduzir payload ao mínimo necessário
 *   3) Anonimizar PII antes de qualquer chamada externa
 *   4) Pré-classificar intenção (sem IA)
 *   5) Construir summary com no máximo 500 caracteres
 *   6) Decidir se requer IA ou ação direta
 *
 * Saída do `processEvent` segue o contrato:
 *   {
 *     intent_pre,
 *     summary,
 *     entities,
 *     priority,
 *     requires_ai
 *   }
 */

const { validateEvent } = require('../envelope');
const { anonymizeText, anonymizePayload } = require('./anonymize');
const { preClassifyIntent, extractEntitiesLite } = require('./preIntent');

const MAX_SUMMARY = 500;

function _truncate(s, max) {
  const t = String(s == null ? '' : s);
  return t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1))}…`;
}

function _extractRawText(event) {
  const p = event.payload || {};
  if (typeof p.text === 'string') return p.text;
  if (typeof p.message === 'string') return p.message;
  if (typeof p.content === 'string') return p.content;
  if (event.type === 'sensor_alert' && p.machine_id) {
    const sev = p.severity ? `[${p.severity}] ` : '';
    return `${sev}Alerta de sensor para máquina ${p.machine_id}`;
  }
  if (event.type === 'task_update' && p.title) {
    return `Atualização de tarefa: ${p.title}${p.status ? ` (${p.status})` : ''}`;
  }
  if (event.type === 'external_data' && p.kind) {
    return `Dado externo: ${p.kind}`;
  }
  if (event.type === 'system_health_snapshot' && p.summary) {
    const s = p.summary;
    return `system_health status=${s.status} cpu=${s.cpu} mem=${s.memoria} falhas=${s.falhas}`;
  }
  return '';
}

function _isNoise(event, rawText) {
  if (event.type === 'chat_message' && rawText.trim().length === 0) return true;
  if (event.type === 'system_health_snapshot' && !event.payload?.summary) return true;
  return false;
}

function _requiresAI(event, intentPre) {
  if (intentPre === 'task') return false;
  if (event.type === 'system_health_snapshot') return true;
  if (event.type === 'external_data') return true;
  return true;
}

/**
 * @param {object} rawEvent — envelope canónico (será revalidado).
 * @returns {{
 *   intent_pre: string,
 *   summary: string,
 *   entities: string[],
 *   priority: 'high'|'medium'|'low',
 *   requires_ai: boolean,
 *   filtered: boolean,
 *   reason?: string,
 *   anonymized_payload: object,
 *   event_id: string,
 *   event_type: string
 * }}
 */
function processEvent(rawEvent) {
  const event = validateEvent(rawEvent);
  const rawText = _extractRawText(event);
  if (_isNoise(event, rawText)) {
    return {
      event_id: event.id,
      event_type: event.type,
      intent_pre: 'conversation',
      summary: '',
      entities: [],
      priority: event.priority,
      requires_ai: false,
      filtered: true,
      reason: 'noise',
      anonymized_payload: {}
    };
  }

  const safeText = anonymizeText(rawText);
  const summary = _truncate(safeText, MAX_SUMMARY);
  const entities = extractEntitiesLite(safeText);
  const { intent_pre } = preClassifyIntent({ type: event.type, text: safeText });
  const requires_ai = _requiresAI(event, intent_pre);
  const anonymized_payload = anonymizePayload(event.payload);

  return {
    event_id: event.id,
    event_type: event.type,
    intent_pre,
    summary,
    entities,
    priority: event.priority,
    requires_ai,
    filtered: false,
    anonymized_payload
  };
}

module.exports = {
  MAX_SUMMARY,
  processEvent
};
