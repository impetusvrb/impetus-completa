'use strict';

/**
 * AIOI-P0.2 — Serviço de ingestão canônico do AIOI.
 *
 * Responsabilidade única: receber um payload IOE normalizado pelos adapters,
 * validar contratos mínimos e persistir atomicamente:
 *   1. INSERT industrial_operational_events (IOE)
 *   2. INSERT aioi_outbox (consumer_type='classification')
 *
 * Contratos obrigatórios (AIOI_ANTI_DUPLICATION_POLICY.md):
 *   - Idempotência: ON CONFLICT(company_id, idempotency_key) DO NOTHING
 *   - RLS: toda query via tenantRlsRuntime.queryWithTenantContext()
 *   - Transação atômica: BEGIN → IOE → OUTBOX → COMMIT; ROLLBACK total em erro
 *   - Sem lógica de execução, decisão ou aprendizado
 *   - Sem chamada direta a operationalPrioritizationService (responsabilidade do adapter)
 *
 * AIOI_BUS_ARCHITECTURE.md §4: INSERT IOE + INSERT outbox na mesma transação.
 * AIOI_IOE_SPECIFICATION.md §5: idempotency_key UNIQUE por company.
 * AIOI_P0_AUTHORIZATION.md R4/R5: RLS obrigatório antes de qualquer INSERT.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { isValidUUID } = require('../../utils/security');

const LAYER = 'AIOI_INGESTION';

// ---------------------------------------------------------------------------
// Valores válidos de ENUM (espelham CHECK constraints da migration P0.1)
// ---------------------------------------------------------------------------
const VALID_SOURCE_TYPES = new Set([
  'plc_telemetry', 'plc_pattern', 'plc_event',
  'communication', 'work_order', 'task', 'mes_erp',
  'quality_nc', 'safety_event', 'environmental', 'manual', 'cognitive_ingestion'
]);

const VALID_CATEGORIES = new Set([
  'equipment_failure', 'equipment_degradation', 'production_deviation',
  'quality_issue', 'safety_incident', 'maintenance_required', 'communication_risk',
  'task_overdue', 'environmental_alert', 'kpi_deviation', 'system_event'
]);

const VALID_STATUSES = new Set([
  'open', 'triaged', 'pending_approval', 'approved', 'rejected',
  'in_progress', 'escalated', 'resolved', 'auto_closed', 'closed'
]);

const VALID_PRIORITY_BANDS = new Set(['critical', 'high', 'medium', 'low']);

const VALID_TRUTH_STATES = new Set([
  'grounded', 'provisional', 'telemetry_only', 'manual_override', 'insufficient_data'
]);

const VALID_AUDIENCE_KEYS = new Set(['ceo', 'operational', 'board', 'investor']);

const VALID_ENTITY_TYPES = new Set([
  'equipment', 'line', 'sector', 'company', 'task', 'communication'
]);

const VALID_VISIBILITY_SCOPES = new Set(['plant', 'company', 'holding']);

const VALID_DECISION_TYPES = new Set([
  'workflow', 'direct_action', 'suggest_only', 'escalate'
]);

// ---------------------------------------------------------------------------
// Validação de contrato mínimo do IOE
// ---------------------------------------------------------------------------

/**
 * Valida campos obrigatórios e valores de ENUM antes do INSERT.
 * Retorna { ok: true } ou { ok: false, errors: string[] }.
 */
function _validateIoePayload(payload) {
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

// ---------------------------------------------------------------------------
// Geração de idempotency_key para o outbox
// ---------------------------------------------------------------------------

/**
 * Formato: 'classification:{ioe_id}'
 * Garante unicidade global do outbox (UNIQUE idempotency_key na migration P0.1).
 */
function _outboxIdempotencyKey(ioeId) {
  return `classification:${ioeId}`;
}

// ---------------------------------------------------------------------------
// Ingestão atômica: IOE + OUTBOX em uma única transação
// ---------------------------------------------------------------------------

/**
 * Persiste um IOE e sua entrada de outbox em transação atômica.
 *
 * @param {object} ioePayload — campos normalizados pelo adapter
 * @returns {Promise<{
 *   ok: boolean,
 *   duplicate?: boolean,
 *   ioe_id?: string,
 *   outbox_id?: string,
 *   error?: string
 * }>}
 */
async function ingestIoe(ioePayload) {
  // -------------------------------------------------------------------------
  // 1. Validação de contrato mínimo
  // -------------------------------------------------------------------------
  const validation = _validateIoePayload(ioePayload);
  if (!validation.ok) {
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR validação falhou`, {
      errors: validation.errors,
      company_id: ioePayload?.company_id,
      source_type: ioePayload?.source_type
    });
    return { ok: false, error: `Validação IOE falhou: ${validation.errors.join('; ')}` };
  }

  const companyId = String(ioePayload.company_id).trim();

  // -------------------------------------------------------------------------
  // 2. Normalização de defaults (valores que o adapter pode omitir)
  // -------------------------------------------------------------------------
  const ioeId = ioePayload.id || uuidv4();
  const correlationId = ioePayload.correlation_id.trim();
  const idempotencyKey = ioePayload.idempotency_key.trim();

  const normalised = {
    id:                   ioeId,
    company_id:           companyId,
    tenant_key:           String(ioePayload.tenant_key).trim(),
    idempotency_key:      idempotencyKey,
    correlation_id:       correlationId,
    external_ref_id:      ioePayload.external_ref_id   || null,
    source_type:          ioePayload.source_type,
    category:             ioePayload.category,
    status:               ioePayload.status            || 'open',
    truth_state:          ioePayload.truth_state       || 'provisional',
    priority_band:        ioePayload.priority_band     || 'low',
    priority_score:       Math.min(100, Math.max(0, Math.round(Number(ioePayload.priority_score) || 0))),
    scores_provisional:   ioePayload.scores_provisional !== false,
    score_attention:      ioePayload.score_attention   != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.score_attention)))) : null,
    score_risk:           ioePayload.score_risk        != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.score_risk)))) : null,
    score_event_conf:     ioePayload.score_event_conf  != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.score_event_conf)))) : null,
    score_pattern_conf:   ioePayload.score_pattern_conf != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.score_pattern_conf)))) : null,
    score_telemetry_hlth: ioePayload.score_telemetry_hlth != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.score_telemetry_hlth)))) : null,
    classification_conf:  ioePayload.classification_conf != null ? Math.min(100, Math.max(0, Math.round(Number(ioePayload.classification_conf)))) : null,
    entity_type:          ioePayload.entity_type,
    entity_id:            ioePayload.entity_id         || null,
    equipment_id:         ioePayload.equipment_id      || null,
    sector_id:            ioePayload.sector_id         || null,
    department_id:        ioePayload.department_id     || null,
    assigned_role_id:     ioePayload.assigned_role_id  || null,
    hierarchy_level:      ioePayload.hierarchy_level   != null ? Number(ioePayload.hierarchy_level) : null,
    audience_key:         ioePayload.audience_key      || 'ceo',
    escalation_level:     Math.max(0, Math.round(Number(ioePayload.escalation_level) || 0)),
    visibility_scope:     ioePayload.visibility_scope  || 'company',
    evidence_refs:        Array.isArray(ioePayload.evidence_refs) ? ioePayload.evidence_refs : [],
    decision_type:        ioePayload.decision_type     || null,
    decision_payload:     ioePayload.decision_payload  || null,
    approved_by_user_id:  ioePayload.approved_by_user_id || null,
    approved_at:          ioePayload.approved_at       || null,
    kpi_snapshot:         ioePayload.kpi_snapshot      || null,
    execution_trace_id:   ioePayload.execution_trace_id || null,
    workflow_instance_id: ioePayload.workflow_instance_id || null,
    resolved_at:          ioePayload.resolved_at       || null,
    resolution_notes:     ioePayload.resolution_notes  || null,
    raw_payload:          ioePayload.raw_payload       || null,
    adapter_version:      ioePayload.adapter_version   || null,
    aioi_version:         ioePayload.aioi_version      || '0.2.0',
    expires_at:           ioePayload.expires_at        || null
  };

  // -------------------------------------------------------------------------
  // 3. Transação atômica com contexto de tenant (RLS ativo — Restrição R4/R5)
  // A query usa tenantRlsRuntime internamente via db.pool.connect() + set_config.
  // -------------------------------------------------------------------------
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_company_id', $1, true)`,
      [companyId]
    );
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    // -----------------------------------------------------------------------
    // 3a. INSERT IOE com idempotência
    // AIOI_IOE_SPECIFICATION.md §5: ON CONFLICT DO NOTHING retorna id existente
    // -----------------------------------------------------------------------
    const ioeResult = await client.query(
      `INSERT INTO industrial_operational_events (
         id, company_id, tenant_key, idempotency_key, correlation_id, external_ref_id,
         source_type, category, status, truth_state, priority_band, priority_score,
         scores_provisional, score_attention, score_risk, score_event_conf,
         score_pattern_conf, score_telemetry_hlth, classification_conf,
         entity_type, entity_id, equipment_id, sector_id, department_id,
         assigned_role_id, hierarchy_level, audience_key, escalation_level,
         visibility_scope, evidence_refs, decision_type, decision_payload,
         approved_by_user_id, approved_at, kpi_snapshot, execution_trace_id,
         workflow_instance_id, resolved_at, resolution_notes, raw_payload,
         adapter_version, aioi_version, expires_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12::smallint,
         $13, $14::smallint, $15::smallint, $16::smallint,
         $17::smallint, $18::smallint, $19::smallint,
         $20, $21::uuid, $22::uuid, $23::uuid, $24::uuid,
         $25::uuid, $26::smallint, $27, $28::smallint,
         $29, $30::jsonb, $31, $32::jsonb,
         $33::uuid, $34, $35::jsonb, $36::uuid,
         $37::uuid, $38, $39, $40::jsonb,
         $41, $42, $43
       )
       ON CONFLICT (company_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        normalised.id, normalised.company_id, normalised.tenant_key,
        normalised.idempotency_key, normalised.correlation_id, normalised.external_ref_id,
        normalised.source_type, normalised.category, normalised.status,
        normalised.truth_state, normalised.priority_band, normalised.priority_score,
        normalised.scores_provisional, normalised.score_attention, normalised.score_risk,
        normalised.score_event_conf, normalised.score_pattern_conf,
        normalised.score_telemetry_hlth, normalised.classification_conf,
        normalised.entity_type, normalised.entity_id, normalised.equipment_id,
        normalised.sector_id, normalised.department_id, normalised.assigned_role_id,
        normalised.hierarchy_level, normalised.audience_key, normalised.escalation_level,
        normalised.visibility_scope, JSON.stringify(normalised.evidence_refs),
        normalised.decision_type, normalised.decision_payload ? JSON.stringify(normalised.decision_payload) : null,
        normalised.approved_by_user_id, normalised.approved_at,
        normalised.kpi_snapshot ? JSON.stringify(normalised.kpi_snapshot) : null,
        normalised.execution_trace_id, normalised.workflow_instance_id,
        normalised.resolved_at, normalised.resolution_notes,
        normalised.raw_payload ? JSON.stringify(normalised.raw_payload) : null,
        normalised.adapter_version, normalised.aioi_version, normalised.expires_at
      ]
    );

    // -----------------------------------------------------------------------
    // 3b. Detectar duplicata
    // -----------------------------------------------------------------------
    if (!ioeResult.rows.length) {
      await client.query('COMMIT');
      console.info(`[${LAYER}] AIOI_IOE_DUPLICATE_IGNORED`, {
        company_id: companyId,
        idempotency_key: idempotencyKey,
        source_type: normalised.source_type
      });
      return { ok: true, duplicate: true };
    }

    const persistedIoeId = ioeResult.rows[0].id;

    // -----------------------------------------------------------------------
    // 3c. INSERT OUTBOX atomicamente com o IOE
    // BUS_ARCHITECTURE §4: consumer_type='classification' em P0.2.
    // Somente placeholder — nenhum consumer ativo nesta fase.
    // -----------------------------------------------------------------------
    const outboxId = uuidv4();
    const outboxIdempotencyKey = _outboxIdempotencyKey(persistedIoeId);

    const outboxPayload = {
      ioe_id: persistedIoeId,
      source_type: normalised.source_type,
      category: normalised.category,
      entity_type: normalised.entity_type,
      entity_id: normalised.entity_id,
      equipment_id: normalised.equipment_id,
      priority_band: normalised.priority_band,
      priority_score: normalised.priority_score,
      truth_state: normalised.truth_state,
      audience_key: normalised.audience_key,
      adapter_version: normalised.adapter_version
    };

    await client.query(
      `INSERT INTO aioi_outbox (
         id, company_id, ioe_id, consumer_type, status, idempotency_key,
         payload, attempts, correlation_id, next_attempt_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6,
         $7::jsonb, 0, $8, now()
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        outboxId, companyId, persistedIoeId,
        'classification', 'pending', outboxIdempotencyKey,
        JSON.stringify(outboxPayload), correlationId
      ]
    );

    await client.query('COMMIT');

    console.info(`[${LAYER}] AIOI_IOE_CREATED`, {
      ioe_id: persistedIoeId,
      company_id: companyId,
      source_type: normalised.source_type,
      category: normalised.category,
      priority_band: normalised.priority_band,
      priority_score: normalised.priority_score,
      truth_state: normalised.truth_state,
      correlation_id: correlationId
    });

    console.info(`[${LAYER}] AIOI_OUTBOX_CREATED`, {
      outbox_id: outboxId,
      ioe_id: persistedIoeId,
      consumer_type: 'classification',
      company_id: companyId,
      correlation_id: correlationId
    });

    return { ok: true, duplicate: false, ioe_id: persistedIoeId, outbox_id: outboxId };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] AIOI_ADAPTER_ERROR ingestão falhou — ROLLBACK`, {
      company_id: companyId,
      idempotency_key: idempotencyKey,
      source_type: ioePayload?.source_type,
      error: err.message
    });
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Geração de correlation_id canônico para o AIOI
// AIOI_IOE_SPECIFICATION.md §4: formato 'ioe-{uuid}' quando não herdado do W2.
// ---------------------------------------------------------------------------

/**
 * Gera um correlation_id no formato canônico AIOI.
 * Usar quando o evento não carrega correlation_id do W2 backbone.
 */
function generateCorrelationId() {
  return `ioe-${uuidv4()}`;
}

// ---------------------------------------------------------------------------
// Geração de idempotency_key canônica
// AIOI_IOE_SPECIFICATION.md §5: '{source_type}:{entity_type}:{entity_id}:{bucket}'
// ---------------------------------------------------------------------------

/**
 * @param {string} sourceType
 * @param {string} entityType
 * @param {string} entityId
 * @param {Date} [date] — data do evento (default: now)
 * @returns {string}
 */
function buildIdempotencyKey(sourceType, entityType, entityId, date) {
  const d = date instanceof Date ? date : new Date();
  const bucket = d.toISOString().slice(0, 13).replace('T', 'T'); // 'YYYY-MM-DDTHH'
  const safeEntityId = String(entityId || 'unknown').replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 64);
  return `${sourceType}:${entityType}:${safeEntityId}:${bucket}`;
}

module.exports = {
  ingestIoe,
  generateCorrelationId,
  buildIdempotencyKey
};
