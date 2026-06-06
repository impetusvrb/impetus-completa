'use strict';

/**
 * AIOI-P1.1 — Builder de payloads de outcome
 *
 * Traduz dados de execução concluída em objeto canônico de outcome
 * e prepara learning_context compatível com operationalLearningService (uso futuro).
 *
 * PROIBIÇÕES:
 *   ✗ Chamar operationalLearningService (learn/train/updateModel)
 *   ✗ Recalcular score, classificação ou decisão
 *   ✗ Criar execução ou inferência
 */

const LAYER = 'AIOI_OUTCOME_PAYLOAD_BUILDER';

const VALID_OUTCOME_STATUSES = Object.freeze([
  'success',
  'partial_success',
  'failure',
  'cancelled'
]);

const CATEGORY_TO_CONTEXT_TAG = {
  equipment_failure:      'failure',
  equipment_degradation:  'failure',
  maintenance_required:   'maintenance',
  production_deviation:   'quality',
  quality_issue:          'quality',
  safety_incident:        'failure',
  communication_risk:     'failure',
  task_overdue:           'maintenance',
  kpi_deviation:          'quality',
  system_event:           'failure'
};

/**
 * Constrói referência de execução a partir do IOE.
 *
 * @param {object} ioe
 * @returns {{ type: 'workflow'|'action', ref_id: string, correlation_id: string|null }|null}
 */
function buildExecutionReference(ioe) {
  if (!ioe) return null;

  if (ioe.workflow_instance_id) {
    return {
      type:           'workflow',
      ref_id:         String(ioe.workflow_instance_id),
      correlation_id: ioe.correlation_id || null
    };
  }

  if (ioe.execution_trace_id) {
    return {
      type:           'action',
      ref_id:         String(ioe.execution_trace_id),
      correlation_id: ioe.correlation_id || null
    };
  }

  return null;
}

/**
 * Valida payload de outcome antes da persistência.
 *
 * @param {object} params
 * @returns {{ ok: boolean, error?: string }}
 */
function validateOutcomePayload(params = {}) {
  const { outcomeStatus, outcomeSummary, evidenceRefs, executionDurationMs } = params;

  if (!outcomeStatus || !VALID_OUTCOME_STATUSES.includes(outcomeStatus)) {
    return { ok: false, error: 'INVALID_OUTCOME_STATUS' };
  }

  if (outcomeSummary != null && typeof outcomeSummary !== 'string') {
    return { ok: false, error: 'INVALID_OUTCOME_SUMMARY' };
  }

  if (evidenceRefs != null && !Array.isArray(evidenceRefs)) {
    return { ok: false, error: 'INVALID_EVIDENCE_REFS' };
  }

  if (executionDurationMs != null) {
    const dur = Number(executionDurationMs);
    if (!Number.isFinite(dur) || dur < 0) {
      return { ok: false, error: 'INVALID_EXECUTION_DURATION' };
    }
  }

  return { ok: true };
}

/**
 * Prepara learning_context compatível com operationalLearningService (NÃO invocado).
 *
 * @param {object} ioe
 * @param {object} outcome
 * @returns {object}
 */
function buildLearningContext(ioe, outcome) {
  const machineId = ioe.equipment_id || ioe.entity_id || null;
  const actionType = _resolveActionType(ioe);
  const contextTag = CATEGORY_TO_CONTEXT_TAG[ioe.category] || 'failure';
  const success = outcome.outcome_status === 'success'
    || outcome.outcome_status === 'partial_success';

  return {
    company_id:            ioe.company_id,
    machine_id:            machineId,
    action_type:           actionType,
    success,
    context_tag:           contextTag,
    ioe_id:                ioe.id,
    correlation_id:        ioe.correlation_id || null,
    decision_type:         ioe.decision_type || null,
    outcome_status:        outcome.outcome_status,
    execution_duration_ms: outcome.execution_duration_ms,
    execution_reference:   outcome.execution_reference,
    evidence_refs:         outcome.evidence_refs || [],
    source:                'aioi_outcome_tracking',
    prepared_at:           outcome.captured_at
  };
}

/**
 * Constrói objeto canônico de outcome.
 *
 * @param {object} ioe
 * @param {object} params
 * @param {string} params.outcomeStatus
 * @param {string} [params.outcomeSummary]
 * @param {Array} [params.evidenceRefs]
 * @param {number} [params.executionDurationMs]
 * @returns {object}
 */
function buildOutcomePayload(ioe, params = {}) {
  if (!ioe) {
    throw new Error(`${LAYER}: ioe inválido`);
  }

  const validation = validateOutcomePayload(params);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const executionReference = buildExecutionReference(ioe);
  if (!executionReference) {
    throw new Error('EXECUTION_REFERENCE_REQUIRED');
  }

  const capturedAt = new Date().toISOString();

  const outcome = {
    outcome_status:        params.outcomeStatus,
    outcome_summary:       params.outcomeSummary ? String(params.outcomeSummary).slice(0, 2000) : null,
    execution_duration_ms: params.executionDurationMs != null
      ? Math.round(Number(params.executionDurationMs))
      : null,
    evidence_refs:         Array.isArray(params.evidenceRefs) ? params.evidenceRefs : [],
    execution_reference:   executionReference,
    captured_at:           capturedAt
  };

  outcome.learning_context = buildLearningContext(ioe, outcome);

  return outcome;
}

function _resolveActionType(ioe) {
  const payload = _parseDecisionPayload(ioe.decision_payload);
  if (payload.tool_name) return String(payload.tool_name);
  if (payload.action_tool) return String(payload.action_tool);
  if (payload.workflow_process_key) return String(payload.workflow_process_key);
  if (ioe.decision_type === 'workflow') return 'aioi_workflow';
  if (ioe.decision_type === 'direct_action') return 'aioi_direct_action';
  return 'aioi_outcome';
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

/**
 * Verifica se o IOE já possui outcome capturado (idempotência O4).
 *
 * @param {object} ioe
 * @returns {boolean}
 */
function hasCapturedOutcome(ioe) {
  if (!ioe) return false;
  const payload = _parseDecisionPayload(ioe.decision_payload);
  return !!(payload.aioi_outcome || payload.aioi_outcome_captured === true);
}

module.exports = {
  VALID_OUTCOME_STATUSES,
  buildOutcomePayload,
  buildExecutionReference,
  buildLearningContext,
  validateOutcomePayload,
  hasCapturedOutcome
};
