'use strict';

/**
 * AIOI-P0.5 — Serviço de aprovação humana (HITL)
 *
 * Responsabilidade: registrar aprovações ou rejeições humanas de sugestões AIOI.
 *
 * Transições permitidas:
 *   triaged          → pending_approval  (moveToPendingApproval)
 *   pending_approval → approved          (approveDecision)
 *   pending_approval → rejected          (rejectDecision)
 *
 * PROIBIÇÕES ABSOLUTAS (AIOI_SOVEREIGNTY_MAP.md / R2 / R3):
 *   ✗ workflowOrchestrator (start/execute/run)
 *   ✗ actionRuntimeOrchestrator (execute/propose)
 *   ✗ operationalDecisionEngine.evaluateOperationalDecisions()
 *   ✗ computePriorityScore / Truth / Learning
 *   ✗ Worker, cron, PM2, API REST, dashboard
 *   ✗ Aprovação automática (approved_by_user_id sempre explícito)
 *
 * Invocação: somente por chamada explícita.
 */

const db = require('../../db');
const { isValidUUID } = require('../../utils/security');
const auditService = require('./aioiApprovalAuditService');
const metrics = require('./aioiApprovalMetrics');

const LAYER = 'AIOI_APPROVAL_SERVICE';
const DEFAULT_LIST_LIMIT = 25;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function _withTenantClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Busca IOE pelo ID (qualquer status elegível).
 */
async function _fetchIoe(companyId, ioeId) {
  return _withTenantClient(companyId, async (client) => {
    const result = await client.query(
      `SELECT id, company_id, status, decision_type, decision_payload,
              correlation_id, approved_by_user_id, approved_at, resolution_notes
       FROM industrial_operational_events
       WHERE id = $1::uuid AND company_id = $2::uuid`,
      [ioeId, companyId]
    );
    return result.rows[0] || null;
  });
}

// ---------------------------------------------------------------------------
// moveToPendingApproval — triaged → pending_approval
// ---------------------------------------------------------------------------

/**
 * Move IOE de 'triaged' para 'pending_approval'.
 * Requer decision_type e decision_payload preenchidos (P0.4).
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @returns {Promise<{ ok: boolean, alreadyProcessed?: boolean, error?: string }>}
 */
async function moveToPendingApproval({ companyId, ioeId }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }

  try {
    const ioe = await _fetchIoe(companyId, ioeId);
    if (!ioe) {
      metrics.recordError(companyId, ioeId, null, 'ioe_not_found');
      return { ok: false, error: 'IOE não encontrado' };
    }

    if (ioe.status === 'pending_approval') {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'already_pending_approval');
      return { ok: true, alreadyProcessed: true };
    }

    if (ioe.status === 'approved' || ioe.status === 'rejected') {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, `already_${ioe.status}`);
      return { ok: true, alreadyProcessed: true };
    }

    if (!ioe.decision_type || !ioe.decision_payload) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'DECISION_REQUIRED');
      return { ok: false, error: 'DECISION_REQUIRED' };
    }

    if (ioe.status !== 'triaged') {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'invalid_status_for_pending');
      return { ok: false, error: `Status inválido para pending_approval: ${ioe.status}` };
    }

    const updated = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `UPDATE industrial_operational_events
         SET status     = 'pending_approval',
             updated_at = now()
         WHERE id              = $2::uuid
           AND company_id      = $1::uuid
           AND status          = 'triaged'
           AND decision_type   IS NOT NULL
           AND decision_payload IS NOT NULL
         RETURNING id`,
        [companyId, ioeId]
      );
      return result.rows.length > 0;
    });

    if (!updated) {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'update_failed');
      return { ok: false, error: 'Falha ao mover para pending_approval' };
    }

    metrics.recordPendingApproval(companyId, ioeId, ioe.correlation_id);
    return { ok: true };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro em moveToPendingApproval`, {
      company_id: companyId, ioe_id: ioeId, error: err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// approveDecision — pending_approval → approved
// ---------------------------------------------------------------------------

/**
 * Registra aprovação humana de uma sugestão.
 * HITL R1: approved_by_user_id obrigatório; approved_at = now().
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @param {string} params.approvedByUserId
 * @param {string} [params.approvalNotes]
 * @returns {Promise<{ ok: boolean, approved?: boolean, alreadyProcessed?: boolean, error?: string }>}
 */
async function approveDecision({ companyId, ioeId, approvedByUserId, approvalNotes }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }
  if (!approvedByUserId || !isValidUUID(String(approvedByUserId))) {
    return { ok: false, error: 'approvedByUserId obrigatório e deve ser UUID válido' };
  }

  const startMs = Date.now();

  try {
    const ioe = await _fetchIoe(companyId, ioeId);
    if (!ioe) {
      metrics.recordError(companyId, ioeId, null, 'ioe_not_found');
      return { ok: false, error: 'IOE não encontrado' };
    }

    // Idempotência R5: já aprovado
    if (ioe.status === 'approved' && ioe.approved_by_user_id && ioe.approved_at) {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'already_approved');
      return { ok: true, alreadyProcessed: true };
    }

    if (ioe.status !== 'pending_approval') {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'invalid_status_for_approval');
      return { ok: false, error: `Status deve ser pending_approval, atual: ${ioe.status}` };
    }

    // Guard idempotência: approved_by_user_id e approved_at devem ser NULL
    if (ioe.approved_by_user_id != null || ioe.approved_at != null) {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'approval_fields_already_set');
      return { ok: true, alreadyProcessed: true };
    }

    const notes = approvalNotes ? String(approvalNotes).slice(0, 500) : null;

    const row = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `UPDATE industrial_operational_events
         SET status              = 'approved',
             approved_by_user_id = $3::uuid,
             approved_at         = now(),
             resolution_notes    = COALESCE($4, resolution_notes),
             updated_at          = now()
         WHERE id                  = $2::uuid
           AND company_id          = $1::uuid
           AND status              = 'pending_approval'
           AND approved_by_user_id IS NULL
           AND approved_at         IS NULL
         RETURNING id, decision_type, correlation_id, approved_by_user_id, approved_at`,
        [companyId, ioeId, approvedByUserId, notes]
      );
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'concurrent_approval');
      return { ok: true, alreadyProcessed: true };
    }

    auditService.recordApproval({
      company_id:     companyId,
      ioe_id:         ioeId,
      user_id:        approvedByUserId,
      decision_type:  row.decision_type,
      correlation_id: row.correlation_id,
      notes
    });

    const latencyMs = Date.now() - startMs;
    metrics.recordApproved(companyId, ioeId, row.correlation_id, row.decision_type, latencyMs);

    console.info(`[${LAYER}] Decisão aprovada (HITL)`, {
      company_id:          companyId,
      ioe_id:              ioeId,
      correlation_id:      row.correlation_id,
      decision_type:       row.decision_type,
      approved_by_user_id: row.approved_by_user_id
    });

    return { ok: true, approved: true };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro em approveDecision`, {
      company_id: companyId, ioe_id: ioeId, error: err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// rejectDecision — pending_approval → rejected
// ---------------------------------------------------------------------------

/**
 * Registra rejeição humana de uma sugestão.
 * approved_by_user_id e approved_at permanecem NULL.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.ioeId
 * @param {string} params.rejectedByUserId
 * @param {string} [params.rejectionNotes]
 * @returns {Promise<{ ok: boolean, rejected?: boolean, alreadyProcessed?: boolean, error?: string }>}
 */
async function rejectDecision({ companyId, ioeId, rejectedByUserId, rejectionNotes }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }
  if (!ioeId || !isValidUUID(String(ioeId))) {
    return { ok: false, error: 'ioeId inválido' };
  }
  if (!rejectedByUserId || !isValidUUID(String(rejectedByUserId))) {
    return { ok: false, error: 'rejectedByUserId obrigatório e deve ser UUID válido' };
  }

  try {
    const ioe = await _fetchIoe(companyId, ioeId);
    if (!ioe) {
      metrics.recordError(companyId, ioeId, null, 'ioe_not_found');
      return { ok: false, error: 'IOE não encontrado' };
    }

    // Idempotência: já rejeitado
    if (ioe.status === 'rejected') {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'already_rejected');
      return { ok: true, alreadyProcessed: true };
    }

    if (ioe.status !== 'pending_approval') {
      metrics.recordError(companyId, ioeId, ioe.correlation_id, 'invalid_status_for_rejection');
      return { ok: false, error: `Status deve ser pending_approval, atual: ${ioe.status}` };
    }

    const notes = rejectionNotes ? String(rejectionNotes).slice(0, 500) : null;

    const row = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `UPDATE industrial_operational_events
         SET status              = 'rejected',
             approved_by_user_id = NULL,
             approved_at         = NULL,
             resolution_notes    = COALESCE($3, resolution_notes),
             updated_at          = now()
         WHERE id         = $2::uuid
           AND company_id = $1::uuid
           AND status     = 'pending_approval'
         RETURNING id, decision_type, correlation_id`,
        [companyId, ioeId, notes]
      );
      return result.rows[0] || null;
    });

    if (!row) {
      metrics.recordSkipped(companyId, ioeId, ioe.correlation_id, 'concurrent_rejection');
      return { ok: true, alreadyProcessed: true };
    }

    auditService.recordRejection({
      company_id:     companyId,
      ioe_id:         ioeId,
      user_id:        rejectedByUserId,
      decision_type:  row.decision_type,
      correlation_id: row.correlation_id,
      notes
    });

    metrics.recordRejected(companyId, ioeId, row.correlation_id, row.decision_type);

    console.info(`[${LAYER}] Decisão rejeitada (HITL)`, {
      company_id:     companyId,
      ioe_id:         ioeId,
      correlation_id: row.correlation_id,
      decision_type:  row.decision_type
    });

    return { ok: true, rejected: true };

  } catch (err) {
    metrics.recordError(companyId, ioeId, null, err.message);
    console.error(`[${LAYER}] Erro em rejectDecision`, {
      company_id: companyId, ioe_id: ioeId, error: err.message
    });
    return { ok: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// getPendingApprovals — listagem somente leitura
// ---------------------------------------------------------------------------

/**
 * Lista IOEs aguardando aprovação humana.
 *
 * @param {object} params
 * @param {string} params.companyId
 * @param {number} [params.limit=25]
 * @returns {Promise<{ ok: boolean, items: object[], error?: string }>}
 */
async function getPendingApprovals({ companyId, limit = DEFAULT_LIST_LIMIT }) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, items: [], error: 'companyId inválido' };
  }

  const lim = Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIST_LIMIT, 1), 100);

  try {
    const rows = await _withTenantClient(companyId, async (client) => {
      const result = await client.query(
        `SELECT id, company_id, status, category, source_type, priority_band,
                decision_type, correlation_id, created_at, updated_at
         FROM industrial_operational_events
         WHERE company_id = $1::uuid
           AND status     = 'pending_approval'
           AND approved_by_user_id IS NULL
           AND approved_at         IS NULL
         ORDER BY created_at ASC
         LIMIT $2`,
        [companyId, lim]
      );
      return result.rows || [];
    });

    return { ok: true, items: rows };
  } catch (err) {
    metrics.recordError(companyId, null, null, err.message);
    return { ok: false, items: [], error: err.message };
  }
}

module.exports = {
  moveToPendingApproval,
  approveDecision,
  rejectDecision,
  getPendingApprovals
};
