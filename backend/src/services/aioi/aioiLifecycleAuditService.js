'use strict';

/**
 * AIOI-P1.3 — Operational Intelligence Audit Service
 *
 * Responsabilidade: observabilidade e rastreabilidade READ ONLY do ciclo AIOI.
 *
 * Fluxo auditado (somente leitura):
 *   Evento → Classificação → Decisão → HITL → Execução → Outcome → Aprendizado
 *
 * PROIBIÇÕES ABSOLUTAS (A1 / A6):
 *   ✗ UPDATE / INSERT / DELETE em industrial_operational_events
 *   ✗ operationalDecisionEngine / operationalLearningService
 *   ✗ workflowOrchestrator / actionRuntimeOrchestrator
 *   ✗ Worker, cron, PM2, API REST, dashboard
 *
 * Invocação: somente por chamada explícita de consulta.
 */

const { isValidUUID } = require('../../utils/security');

const snapshotService = require('./aioiLifecycleSnapshotService');
const metrics = require('./aioiLifecycleMetrics');

const LAYER = 'AIOI_LIFECYCLE_AUDIT';
const DEFAULT_BACKLOG_LIMIT = 50;

// ---------------------------------------------------------------------------
// getIoeLifecycle — A3
// ---------------------------------------------------------------------------

/**
 * Rastreabilidade completa de um IOE (read-only).
 *
 * @param {string} ioeId
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getIoeLifecycle(ioeId, companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }

  metrics.recordAuditRequested(companyId, ioeId);
  const startMs = Date.now();

  try {
    const row = await snapshotService._withTenantReadClient(companyId, async (client) => {
      const result = await snapshotService._readQuery(client,
        `SELECT id, company_id, correlation_id, source_type, category, priority_band,
                status, decision_type,
                approved_by_user_id, approved_at,
                workflow_instance_id, execution_trace_id,
                decision_payload, created_at, updated_at, resolved_at
         FROM industrial_operational_events
         WHERE id = $1::uuid AND company_id = $2::uuid`,
        [ioeId, companyId]
      );
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordError(companyId, 'getIoeLifecycle', 'IOE não encontrado');
      return { ok: false, error: 'IOE não encontrado' };
    }

    const payload = _parseDecisionPayload(row.decision_payload);
    const outcome = payload.aioi_outcome || null;

    const lifecycle = {
      ioe_id:               row.id,
      correlation_id:       row.correlation_id,
      source_type:          row.source_type,
      category:             row.category,
      priority_band:        row.priority_band,
      status:               row.status,
      decision_type:        row.decision_type,
      approved_by_user_id:  row.approved_by_user_id,
      approved_at:          row.approved_at,
      workflow_instance_id: row.workflow_instance_id,
      execution_trace_id:   row.execution_trace_id,
      outcome_status:       outcome?.outcome_status || null,
      learning_submitted:   payload.aioi_learning_submitted === true,
      learning_processed:   payload.aioi_learning_processed === true
    };

    metrics.recordQuery(companyId, 'ioe_lifecycle', Date.now() - startMs);

    return { ok: true, lifecycle };

  } catch (err) {
    metrics.recordError(companyId, 'getIoeLifecycle', err.message);
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Backlogs — A4 (read-only)
// ---------------------------------------------------------------------------

async function _fetchBacklog(companyId, sql, params, backlogType) {
  const rows = await snapshotService._withTenantReadClient(companyId, async (client) => {
    const result = await snapshotService._readQuery(client, sql, params);
    return result.rows || [];
  });
  metrics.recordBacklogDetected(companyId, backlogType, rows.length);
  return rows;
}

/**
 * IOEs aguardando aprovação HITL.
 *
 * @param {string} companyId
 * @param {number} [limit=50]
 * @returns {Promise<object>}
 */
async function getApprovalBacklog(companyId, limit = DEFAULT_BACKLOG_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', backlog: [] };
  }

  const lim = _clampLimit(limit);
  const startMs = Date.now();

  try {
    const rows = await _fetchBacklog(
      companyId,
      `SELECT id, correlation_id, category, priority_band, decision_type, created_at, updated_at
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'pending_approval'
       ORDER BY updated_at ASC
       LIMIT $2`,
      [companyId, lim],
      'approval'
    );

    metrics.recordQuery(companyId, 'approval_backlog', Date.now() - startMs);
    return { ok: true, backlog: rows, count: rows.length };

  } catch (err) {
    metrics.recordError(companyId, 'getApprovalBacklog', err.message);
    return { ok: false, error: err.message, backlog: [] };
  }
}

/**
 * IOEs aprovados aguardando delegação de execução.
 *
 * @param {string} companyId
 * @param {number} [limit=50]
 * @returns {Promise<object>}
 */
async function getExecutionBacklog(companyId, limit = DEFAULT_BACKLOG_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', backlog: [] };
  }

  const lim = _clampLimit(limit);
  const startMs = Date.now();

  try {
    const rows = await _fetchBacklog(
      companyId,
      `SELECT id, correlation_id, category, decision_type, approved_at, created_at
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'approved'
         AND approved_by_user_id IS NOT NULL
         AND approved_at IS NOT NULL
         AND execution_trace_id IS NULL
         AND workflow_instance_id IS NULL
       ORDER BY approved_at ASC
       LIMIT $2`,
      [companyId, lim],
      'execution'
    );

    metrics.recordQuery(companyId, 'execution_backlog', Date.now() - startMs);
    return { ok: true, backlog: rows, count: rows.length };

  } catch (err) {
    metrics.recordError(companyId, 'getExecutionBacklog', err.message);
    return { ok: false, error: err.message, backlog: [] };
  }
}

/**
 * IOEs em execução aguardando captura de outcome.
 *
 * @param {string} companyId
 * @param {number} [limit=50]
 * @returns {Promise<object>}
 */
async function getOutcomeBacklog(companyId, limit = DEFAULT_BACKLOG_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', backlog: [] };
  }

  const lim = _clampLimit(limit);
  const startMs = Date.now();

  try {
    const rows = await _fetchBacklog(
      companyId,
      `SELECT id, correlation_id, category, decision_type,
              workflow_instance_id, execution_trace_id, updated_at
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'in_progress'
         AND (execution_trace_id IS NOT NULL OR workflow_instance_id IS NOT NULL)
         AND (decision_payload->>'aioi_outcome_captured' IS NULL
              OR decision_payload->>'aioi_outcome_captured' = 'false')
       ORDER BY updated_at ASC
       LIMIT $2`,
      [companyId, lim],
      'outcome'
    );

    metrics.recordQuery(companyId, 'outcome_backlog', Date.now() - startMs);
    return { ok: true, backlog: rows, count: rows.length };

  } catch (err) {
    metrics.recordError(companyId, 'getOutcomeBacklog', err.message);
    return { ok: false, error: err.message, backlog: [] };
  }
}

/**
 * IOEs resolvidos aguardando submissão de aprendizado.
 *
 * @param {string} companyId
 * @param {number} [limit=50]
 * @returns {Promise<object>}
 */
async function getLearningBacklog(companyId, limit = DEFAULT_BACKLOG_LIMIT) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido', backlog: [] };
  }

  const lim = _clampLimit(limit);
  const startMs = Date.now();

  try {
    const rows = await _fetchBacklog(
      companyId,
      `SELECT id, correlation_id, category, decision_type, resolved_at
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status = 'resolved'
         AND decision_payload->'aioi_outcome'->'learning_context' IS NOT NULL
         AND (decision_payload->>'aioi_learning_submitted' IS NULL
              OR decision_payload->>'aioi_learning_submitted' = 'false')
       ORDER BY resolved_at ASC NULLS LAST
       LIMIT $2`,
      [companyId, lim],
      'learning'
    );

    metrics.recordQuery(companyId, 'learning_backlog', Date.now() - startMs);
    return { ok: true, backlog: rows, count: rows.length };

  } catch (err) {
    metrics.recordError(companyId, 'getLearningBacklog', err.message);
    return { ok: false, error: err.message, backlog: [] };
  }
}

// ---------------------------------------------------------------------------
// Re-export snapshot + KPIs
// ---------------------------------------------------------------------------

function _parseDecisionPayload(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function _clampLimit(limit) {
  return Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_BACKLOG_LIMIT, 1), 200);
}

module.exports = {
  getIoeLifecycle,
  getApprovalBacklog,
  getExecutionBacklog,
  getOutcomeBacklog,
  getLearningBacklog,
  getLifecycleSnapshot: snapshotService.getLifecycleSnapshot,
  getCycleKpis:           snapshotService.getCycleKpis
};
