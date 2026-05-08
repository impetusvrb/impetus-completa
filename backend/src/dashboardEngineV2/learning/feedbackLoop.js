'use strict';

/**
 * Feedback Loop — esqueleto de captura de feedback explícito do utilizador
 * sobre a relevância dos widgets entregues.
 *
 * Estrutura mínima:
 *   {
 *     trace_id, user_id, company_id,
 *     widget_id, kind: 'helpful'|'not_helpful'|'irrelevant'|'wanted_but_missing',
 *     reason_text?,
 *     submitted_at
 *   }
 *
 * Buffer em memória — em produção pode ser ligado a:
 *   - Firestore (escrita assíncrona)
 *   - PostgreSQL (`dashboard_widget_feedback`)
 *   - eventPipeline existente (`feedback_submitted`)
 *
 * NÃO implementa learning. Apenas armazena para futura ingestão.
 */

const learningHooks = require('./learningHooks');

const VALID_KINDS = new Set(['helpful', 'not_helpful', 'irrelevant', 'wanted_but_missing']);

const _state = {
  buffer: [],
  size: 1000,
  enabled: true
};

function configure({ size = 1000, enabled = true } = {}) {
  _state.size = Math.max(100, Number(size) || 1000);
  _state.enabled = !!enabled;
}

function clearBuffer() {
  _state.buffer.length = 0;
}

/**
 * Regista feedback. Devolve o objeto guardado, ou null se desligado/erro.
 */
function record(feedback) {
  if (!_state.enabled || !feedback) return null;
  const kind = String(feedback.kind || '').toLowerCase();
  if (!VALID_KINDS.has(kind)) return null;
  if (!feedback.widget_id) return null;
  const entry = {
    trace_id: feedback.trace_id || null,
    user_id: feedback.user_id || null,
    company_id: feedback.company_id || null,
    widget_id: String(feedback.widget_id),
    kind,
    reason_text: feedback.reason_text ? String(feedback.reason_text).slice(0, 500) : null,
    submitted_at: new Date().toISOString()
  };
  _state.buffer.push(entry);
  while (_state.buffer.length > _state.size) _state.buffer.shift();
  // notifica hooks de aprendizagem (handlers default = noop)
  try { learningHooks.notifyFeedback(entry); } catch (_) { /* silent */ }
  return entry;
}

function summary() {
  const byKind = {};
  const byWidget = {};
  for (const f of _state.buffer) {
    byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    byWidget[f.widget_id] = byWidget[f.widget_id] || { helpful: 0, not_helpful: 0, irrelevant: 0, wanted_but_missing: 0 };
    byWidget[f.widget_id][f.kind] += 1;
  }
  return { total: _state.buffer.length, by_kind: byKind, by_widget: byWidget };
}

module.exports = {
  configure,
  clearBuffer,
  record,
  summary,
  _state
};
