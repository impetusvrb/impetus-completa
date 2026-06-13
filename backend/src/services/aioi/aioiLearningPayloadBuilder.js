'use strict';

/**
 * AIOI-P1.2 — Builder de payloads de aprendizado
 *
 * Converte decision_payload.aioi_outcome.learning_context para o formato
 * esperado por operationalLearningService.recordOperationalOutcome().
 *
 * PROIBIÇÕES (L3):
 *   ✗ Interpretar, classificar ou recalcular outcomes
 *   ✗ Enriquecimento, heurísticas ou IA
 *   ✗ Campos artificiais além do mapeamento direto
 */

const LAYER = 'AIOI_LEARNING_PAYLOAD_BUILDER';

/**
 * Constrói referência de outcome a partir do learning_context.
 *
 * @param {object} learningContext
 * @returns {{ type: string, ref_id: string, correlation_id: string|null }|null}
 */
function buildOutcomeReference(learningContext) {
  if (!learningContext || !learningContext.execution_reference) {
    return null;
  }
  const ref = learningContext.execution_reference;
  return {
    type:           ref.type || null,
    ref_id:         ref.ref_id || null,
    correlation_id: learningContext.correlation_id || ref.correlation_id || null
  };
}

/**
 * Valida learning_context antes da delegação.
 *
 * @param {object} learningContext
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateLearningPayload(learningContext) {
  if (!learningContext || typeof learningContext !== 'object') {
    return { ok: false, reason: 'LEARNING_CONTEXT_REQUIRED' };
  }
  if (!learningContext.machine_id || String(learningContext.machine_id).trim() === '') {
    return { ok: false, reason: 'MACHINE_ID_REQUIRED' };
  }
  if (!learningContext.company_id) {
    return { ok: false, reason: 'COMPANY_ID_REQUIRED' };
  }
  if (typeof learningContext.success !== 'boolean') {
    return { ok: false, reason: 'SUCCESS_FLAG_REQUIRED' };
  }
  if (!learningContext.action_type) {
    return { ok: false, reason: 'ACTION_TYPE_REQUIRED' };
  }
  return { ok: true };
}

/**
 * Converte learning_context para recordOperationalOutcome().
 * Mapeamento direto — sem transformação decisória.
 *
 * @param {object} learningContext — de decision_payload.aioi_outcome.learning_context
 * @returns {{ action: object, result: object, company_id: string }}
 */
function buildLearningPayload(learningContext) {
  const validation = validateLearningPayload(learningContext);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  return {
    action: {
      machine_id:  String(learningContext.machine_id).trim(),
      company_id:  String(learningContext.company_id).trim(),
      action_type: String(learningContext.action_type).trim(),
      correlation_id: learningContext.correlation_id || null,
      external_ref_id: learningContext.external_ref_id || null,
      truth_state: learningContext.truth_state || null,
      evidence_refs: Array.isArray(learningContext.evidence_refs) ? learningContext.evidence_refs : [],
      context_tag: learningContext.context_tag || null
    },
    result: {
      success:        learningContext.success,
      context_tag:    learningContext.context_tag || null,
      outcome_status: learningContext.outcome_status || null,
      correlation_id: learningContext.correlation_id || null,
      truth_state:    learningContext.truth_state || null,
      evidence_refs:  Array.isArray(learningContext.evidence_refs) ? learningContext.evidence_refs : []
    },
    company_id: String(learningContext.company_id).trim()
  };
}

/**
 * Extrai learning_context do decision_payload do IOE.
 *
 * @param {object} ioe
 * @returns {object|null}
 */
function extractLearningContext(ioe) {
  if (!ioe) return null;
  const payload = _parseDecisionPayload(ioe.decision_payload);
  return payload?.aioi_outcome?.learning_context || null;
}

/**
 * Verifica se aprendizado já foi submetido (idempotência L4).
 *
 * @param {object} ioe
 * @returns {boolean}
 */
function hasLearningSubmitted(ioe) {
  if (!ioe) return false;
  const payload = _parseDecisionPayload(ioe.decision_payload);
  return payload.aioi_learning_submitted === true;
}

function _parseDecisionPayload(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

module.exports = {
  buildLearningPayload,
  buildOutcomeReference,
  validateLearningPayload,
  extractLearningContext,
  hasLearningSubmitted
};
