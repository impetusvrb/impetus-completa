'use strict';

/**
 * Refinamento de intenção via Gemini, com contrato fechado.
 *
 *   Entrada: output do Event Processor (intent_pre, summary, entities, priority).
 *   Saída obrigatória:
 *     {
 *       intent: 'conversation'|'analysis'|'task'|'external_data'|'system_health',
 *       confidence: 0..1,
 *       entities: string[],
 *       priority: 'high'|'medium'|'low'
 *     }
 *
 * Gemini NÃO conversa, NÃO acede DB, NÃO recebe payload bruto. Recebe summary anonimizado.
 */

const geminiService = require('../../services/geminiService');
const { callWithRetry } = require('../resilience/aiResilience');

const ALLOWED_INTENTS = new Set([
  'conversation',
  'analysis',
  'task',
  'external_data',
  'system_health'
]);

const ALLOWED_PRIORITIES = new Set(['high', 'medium', 'low']);

function _normalizeIntent(v, fallback) {
  const s = String(v || '').toLowerCase().trim();
  if (ALLOWED_INTENTS.has(s)) return s;
  return fallback;
}

function _normalizePriority(v, fallback) {
  const s = String(v || '').toLowerCase().trim();
  if (ALLOWED_PRIORITIES.has(s)) return s;
  return fallback;
}

function _normalizeConfidence(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (n > 1 && n <= 100) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function _normalizeEntities(v, fallback) {
  if (!Array.isArray(v)) return fallback;
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

function _fallback(processed) {
  return {
    intent: _normalizeIntent(processed.intent_pre, 'conversation'),
    confidence: 0.5,
    entities: Array.isArray(processed.entities) ? processed.entities.slice(0, 20) : [],
    priority: _normalizePriority(processed.priority, 'medium'),
    refined_by: 'fallback'
  };
}

function _buildPrompt(processed) {
  return `És o classificador semântico do IMPETUS. Refina a intenção.

Entrada (sumário sanitizado, sem PII):
"""
${processed.summary || ''}
"""
Intenção pré-classificada: ${processed.intent_pre}
Entidades: ${JSON.stringify(processed.entities || [])}
Prioridade actual: ${processed.priority}
Tipo de evento: ${processed.event_type}

Devolve APENAS JSON válido:
{
  "intent": "conversation|analysis|task|external_data|system_health",
  "confidence": 0.0,
  "entities": ["..."],
  "priority": "high|medium|low"
}`;
}

/**
 * @param {object} processed — saída do Event Processor
 * @returns {Promise<{ intent: string, confidence: number, entities: string[], priority: string, refined_by: 'gemini'|'fallback' }>}
 */
async function refineIntent(processed) {
  if (!processed || typeof processed !== 'object') {
    throw new Error('refineIntent: processed inválido');
  }
  if (!geminiService.isAvailable()) {
    return _fallback(processed);
  }
  return callWithRetry(
    async () => {
      const raw = await geminiService.generateText(_buildPrompt(processed));
      let parsed = null;
      if (typeof raw === 'string') {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            parsed = JSON.parse(m[0]);
          } catch (_e) {
            parsed = null;
          }
        }
      }
      if (!parsed || typeof parsed !== 'object') {
        const e = new Error('Gemini retornou payload inválido');
        e.code = 'GEMINI_INVALID_OUTPUT';
        throw e;
      }
      return {
        intent: _normalizeIntent(parsed.intent, processed.intent_pre || 'conversation'),
        confidence: _normalizeConfidence(parsed.confidence, 0.6),
        entities: _normalizeEntities(parsed.entities, processed.entities || []),
        priority: _normalizePriority(parsed.priority, processed.priority || 'medium'),
        refined_by: 'gemini'
      };
    },
    {
      fallback: () => _fallback(processed),
      metadata: {
        ia_chamada: 'gemini',
        intent: processed.intent_pre,
        event_id: processed.event_id,
        type: processed.event_type
      }
    }
  );
}

module.exports = {
  refineIntent,
  ALLOWED_INTENTS,
  ALLOWED_PRIORITIES
};
