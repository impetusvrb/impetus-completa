'use strict';

/**
 * AIOI-P0.2 — Schema canónico Industrial Operational Event (IOE)
 *
 * Extraído de aioiEventIngestionService (política anti-duplicação).
 * Fonte única de validação de contrato mínimo antes do INSERT.
 *
 * @see AIOI_IOE_SPECIFICATION.md
 * @see aioi_ioe_foundation_migration.sql
 */

const { isValidUUID } = require('../utils/security');

const VALID_SOURCE_TYPES = Object.freeze(new Set([
  'plc_telemetry', 'plc_pattern', 'plc_event',
  'communication', 'work_order', 'task', 'mes_erp',
  'quality_nc', 'safety_event', 'environmental', 'manual', 'cognitive_ingestion'
]));

const VALID_CATEGORIES = Object.freeze(new Set([
  'equipment_failure', 'equipment_degradation', 'production_deviation',
  'quality_issue', 'safety_incident', 'maintenance_required', 'communication_risk',
  'task_overdue', 'environmental_alert', 'kpi_deviation', 'system_event'
]));

const VALID_STATUSES = Object.freeze(new Set([
  'open', 'triaged', 'pending_approval', 'approved', 'rejected',
  'in_progress', 'escalated', 'resolved', 'auto_closed', 'closed'
]));

const VALID_PRIORITY_BANDS = Object.freeze(new Set(['critical', 'high', 'medium', 'low']));

const VALID_TRUTH_STATES = Object.freeze(new Set([
  'grounded', 'provisional', 'telemetry_only', 'manual_override', 'insufficient_data'
]));

const VALID_AUDIENCE_KEYS = Object.freeze(new Set(['ceo', 'operational', 'board', 'investor']));

const VALID_ENTITY_TYPES = Object.freeze(new Set([
  'equipment', 'line', 'sector', 'company', 'task', 'communication'
]));

const VALID_VISIBILITY_SCOPES = Object.freeze(new Set(['plant', 'company', 'holding']));

const VALID_DECISION_TYPES = Object.freeze(new Set([
  'workflow', 'direct_action', 'suggest_only', 'escalate'
]));

/**
 * Valida campos obrigatórios e valores de ENUM antes do INSERT.
 * @param {object} payload
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
function validateIoePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload inválido ou ausente'] };
  }

  if (!payload.company_id || !isValidUUID(String(payload.company_id))) {
    errors.push('company_id obrigatório e deve ser UUID válido');
  }
  if (!payload.tenant_key || typeof payload.tenant_key !== 'string' || !payload.tenant_key.trim()) {
    errors.push('tenant_key obrigatório (string não-vazia)');
  }
  if (!payload.idempotency_key || typeof payload.idempotency_key !== 'string' || !payload.idempotency_key.trim()) {
    errors.push('idempotency_key obrigatório');
  }
  if (!payload.correlation_id || typeof payload.correlation_id !== 'string' || !payload.correlation_id.trim()) {
    errors.push('correlation_id obrigatório');
  }
  if (!payload.source_type || !VALID_SOURCE_TYPES.has(payload.source_type)) {
    errors.push(`source_type inválido: ${payload.source_type}. Permitidos: ${[...VALID_SOURCE_TYPES].join(', ')}`);
  }
  if (!payload.category || !VALID_CATEGORIES.has(payload.category)) {
    errors.push(`category inválida: ${payload.category}`);
  }
  if (!payload.entity_type || !VALID_ENTITY_TYPES.has(payload.entity_type)) {
    errors.push(`entity_type inválido: ${payload.entity_type}`);
  }
  if (payload.priority_band && !VALID_PRIORITY_BANDS.has(payload.priority_band)) {
    errors.push(`priority_band inválido: ${payload.priority_band}`);
  }
  if (payload.truth_state && !VALID_TRUTH_STATES.has(payload.truth_state)) {
    errors.push(`truth_state inválido: ${payload.truth_state}`);
  }
  if (payload.audience_key && !VALID_AUDIENCE_KEYS.has(payload.audience_key)) {
    errors.push(`audience_key inválido: ${payload.audience_key}`);
  }
  if (payload.visibility_scope && !VALID_VISIBILITY_SCOPES.has(payload.visibility_scope)) {
    errors.push(`visibility_scope inválido: ${payload.visibility_scope}`);
  }
  if (payload.decision_type != null && !VALID_DECISION_TYPES.has(payload.decision_type)) {
    errors.push(`decision_type inválido: ${payload.decision_type}`);
  }
  const score = Number(payload.priority_score);
  if (!Number.isNaN(score) && (score < 0 || score > 100)) {
    errors.push('priority_score deve ser 0–100');
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = {
  VALID_SOURCE_TYPES,
  VALID_CATEGORIES,
  VALID_STATUSES,
  VALID_PRIORITY_BANDS,
  VALID_TRUTH_STATES,
  VALID_AUDIENCE_KEYS,
  VALID_ENTITY_TYPES,
  VALID_VISIBILITY_SCOPES,
  VALID_DECISION_TYPES,
  validateIoePayload,
};
