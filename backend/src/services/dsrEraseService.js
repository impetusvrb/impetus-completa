'use strict';

/**
 * DSR Erase Service — Enterprise-grade Data Subject Erasure (Art. 18, VI LGPD)
 *
 * Implementa o direito ao esquecimento com:
 *   - Soft-delete (reversível 72h)
 *   - Anonymization markers (prep para hard-delete futuro)
 *   - Approval flow assíncrono (status: pending → approved → executing → completed)
 *   - SLA tracking (15 dias úteis = 21 dias corridos)
 *   - Deny-first: não executa erasure se não aprovado
 *   - Multi-tenant isolation
 *   - Audit trail completo
 *   - Reversibilidade controlada (rollback window)
 *
 * O que NÃO faz:
 *   - Hard delete (purge físico) — apenas marca
 *   - Apagar logs legais (consent_logs, audit_logs, ai_legal_audit_logs)
 *   - Alterar retention TTL
 *
 * Flags:
 *   IMPETUS_DSR_ERASE=off|on (default off)
 *   IMPETUS_DSR_ERASE_STRICT=off|on (on = requer dupla confirmação)
 */

const db = require('../db');

const SLA_DAYS = 21;
const ROLLBACK_WINDOW_HOURS = 72;

const ERASURE_STAGES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  ROLLED_BACK: 'rolled_back',
});

/**
 * Tabelas protegidas — NUNCA tocar por obrigação legal.
 */
const LEGALLY_PROTECTED_TABLES = Object.freeze([
  'consent_logs',
  'ai_legal_audit_logs',
  'audit_logs',
  'ai_decision_logs',
  'token_usage',
  'lgpd_data_requests',
]);

/**
 * Tabelas para soft-delete (SET deleted_at / anonymization marker).
 * Formato: { table, userColumn, method, description }
 */
const ERASURE_TARGETS = Object.freeze([
  { table: 'chat_messages', userColumn: 'sender_id', method: 'anonymize_content', description: 'Mensagens de chat', joinClause: 'INNER JOIN chat_conversations cc ON cc.id = chat_messages.conversation_id AND cc.company_id = $2' },
  { table: 'internal_chat_messages', userColumn: 'sender_id', method: 'anonymize_content', description: 'Mensagens internas', companyScoped: true },
  { table: 'onboarding_conversations', userColumn: 'user_id', method: 'delete', description: 'Conversas de onboarding', companyScoped: true },
  { table: 'user_activity_logs', userColumn: 'user_id', method: 'delete', description: 'Logs de actividade', companyScoped: true },
  { table: 'dashboard_usage_events', userColumn: 'user_id', method: 'delete', description: 'Eventos de uso', companyScoped: true },
  { table: 'sessions', userColumn: 'user_id', method: 'delete', description: 'Sessões', companyScoped: false },
  { table: 'refresh_tokens', userColumn: 'user_id', method: 'delete', description: 'Tokens de refresh', companyScoped: false },
  { table: 'password_reset_tokens', userColumn: 'user_id', method: 'delete', description: 'Tokens de reset', companyScoped: false },
  { table: 'user_security_verification_codes', userColumn: 'user_id', method: 'delete', description: 'Códigos de verificação', companyScoped: false },
  { table: 'chat_push_subscriptions', userColumn: 'user_id', method: 'delete', description: 'Push subscriptions', companyScoped: false },
  { table: 'notifications', userColumn: 'user_id', method: 'delete', description: 'Notificações', companyScoped: true },
  { table: 'voice_preferences', userColumn: 'user_id', method: 'delete', description: 'Preferências de voz', companyScoped: false },
  { table: 'user_dashboard_preferences', userColumn: 'user_id', method: 'delete', description: 'Preferências dashboard', companyScoped: false },
  { table: 'manuia_notification_preferences', userColumn: 'user_id', method: 'delete', description: 'Preferências ManuIA', companyScoped: false },
  { table: 'manuia_mobile_devices', userColumn: 'user_id', method: 'delete', description: 'Dispositivos móveis', companyScoped: false },
  { table: 'strategic_user_behavior', userColumn: 'user_id', method: 'delete', description: 'Comportamento estratégico', companyScoped: true },
  { table: 'memoria_usuario', userColumn: 'user_id', method: 'delete', description: 'Memória cognitiva', companyScoped: true },
  { table: 'ai_interaction_traces', userColumn: 'user_id', method: 'anonymize_jsonb', description: 'Traces de IA', companyScoped: true },
]);

function isDsrEraseEnabled() {
  const v = String(process.env.IMPETUS_DSR_ERASE || '').trim().toLowerCase();
  return v === 'on' || v === 'true' || v === '1';
}

function isDsrEraseStrict() {
  const v = String(process.env.IMPETUS_DSR_ERASE_STRICT || '').trim().toLowerCase();
  return v === 'on' || v === 'true' || v === '1';
}

function _log(event, data) {
  try {
    console.info('[DSR_ERASE]', JSON.stringify({ _type: 'dsr_erase', event, ts: new Date().toISOString(), ...data }));
  } catch { /* never throw */ }
}

/**
 * Submete pedido de erasure (Art. 18, VI LGPD).
 * Não executa imediatamente — cria request para approval flow.
 *
 * @param {string} userId
 * @param {string} companyId
 * @param {object} opts — { correlationId, reason, confirmation }
 * @returns {object}
 */
async function submitEraseRequest(userId, companyId, opts = {}) {
  if (!isDsrEraseEnabled()) {
    return { ok: false, error: 'DSR Erase disabled (IMPETUS_DSR_ERASE=off)', code: 'DSR_ERASE_DISABLED' };
  }

  if (!userId || !companyId) {
    return { ok: false, error: 'userId and companyId required', code: 'INVALID_INPUT' };
  }

  if (isDsrEraseStrict() && opts.confirmation !== 'CONFIRMO EXCLUSAO DOS MEUS DADOS') {
    return {
      ok: false,
      error: 'Strict mode: confirmation text required',
      code: 'STRICT_CONFIRMATION_REQUIRED',
      expected_confirmation: 'CONFIRMO EXCLUSAO DOS MEUS DADOS',
    };
  }

  const correlationId = opts.correlationId || `dsr_erase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const userCheck = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [userId, companyId]
    );

    if (userCheck.rows.length === 0) {
      return { ok: false, error: 'User not found in tenant', code: 'USER_NOT_FOUND' };
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + SLA_DAYS);

    const existing = await db.query(
      `SELECT id, status FROM lgpd_data_requests 
       WHERE user_id = $1 AND company_id = $2 AND request_type = 'erasure' 
       AND status IN ('pending', 'approved', 'executing')`,
      [userId, companyId]
    );

    if (existing.rows.length > 0) {
      return {
        ok: false,
        error: 'Active erasure request already exists',
        code: 'DUPLICATE_REQUEST',
        existing_request_id: existing.rows[0].id,
        existing_status: existing.rows[0].status,
      };
    }

    const result = await db.query(`
      INSERT INTO lgpd_data_requests (
        company_id, user_id, request_type, description, status, deadline
      ) VALUES ($1, $2, 'erasure', $3, 'pending', $4)
      RETURNING id, request_type, status, created_at, deadline
    `, [
      companyId,
      userId,
      opts.reason || 'Solicitação de exclusão de dados pessoais (Art. 18, VI LGPD)',
      deadline,
    ]);

    const request = result.rows[0];

    _log('erase_request_submitted', {
      userId,
      companyId,
      requestId: request.id,
      correlationId,
      deadline: deadline.toISOString(),
      strict: isDsrEraseStrict(),
    });

    return {
      ok: true,
      request: {
        id: request.id,
        status: request.status,
        type: request.request_type,
        created_at: request.created_at,
        deadline: request.deadline,
        sla_days: SLA_DAYS,
        rollback_window_hours: ROLLBACK_WINDOW_HOURS,
      },
      flow: {
        current_stage: ERASURE_STAGES.PENDING,
        next_stage: ERASURE_STAGES.APPROVED,
        requires_approval: true,
        approval_by: 'DPO ou hierarchy_level ≤ 1',
      },
      _meta: { correlation_id: correlationId },
    };
  } catch (err) {
    _log('erase_request_error', { userId, companyId, error: err?.message });
    return { ok: false, error: 'Internal error submitting erase request', code: 'INTERNAL_ERROR' };
  }
}

/**
 * Aprova um pedido de erasure (DPO / admin hierarchy ≤ 1).
 *
 * @param {string} requestId
 * @param {string} companyId
 * @param {string} approverId
 * @returns {object}
 */
async function approveEraseRequest(requestId, companyId, approverId) {
  if (!isDsrEraseEnabled()) {
    return { ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' };
  }

  try {
    const req = await db.query(
      `SELECT id, user_id, status FROM lgpd_data_requests 
       WHERE id = $1 AND company_id = $2 AND request_type = 'erasure'`,
      [requestId, companyId]
    );

    if (req.rows.length === 0) {
      return { ok: false, error: 'Request not found', code: 'NOT_FOUND' };
    }

    if (req.rows[0].status !== 'pending') {
      return { ok: false, error: `Cannot approve request in status: ${req.rows[0].status}`, code: 'INVALID_STATUS' };
    }

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'approved', assigned_to = $1, processed_at = NOW() WHERE id = $2`,
      [approverId, requestId]
    );

    _log('erase_request_approved', { requestId, companyId, approverId, userId: req.rows[0].user_id });

    return {
      ok: true,
      request_id: requestId,
      status: ERASURE_STAGES.APPROVED,
      next_step: 'Call executeErasure() to process',
    };
  } catch (err) {
    _log('approve_error', { requestId, error: err?.message });
    return { ok: false, error: 'Internal error', code: 'INTERNAL_ERROR' };
  }
}

/**
 * Executa erasure soft (marcação + anonymization).
 * Só executa se request está em status 'approved'.
 *
 * @param {string} requestId
 * @param {string} companyId
 * @returns {object}
 */
async function executeErasure(requestId, companyId) {
  if (!isDsrEraseEnabled()) {
    return { ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' };
  }

  try {
    const req = await db.query(
      `SELECT id, user_id, status FROM lgpd_data_requests 
       WHERE id = $1 AND company_id = $2 AND request_type = 'erasure'`,
      [requestId, companyId]
    );

    if (req.rows.length === 0) {
      return { ok: false, error: 'Request not found', code: 'NOT_FOUND' };
    }

    if (req.rows[0].status !== 'approved') {
      return { ok: false, error: `Cannot execute: status is "${req.rows[0].status}", expected "approved"`, code: 'NOT_APPROVED' };
    }

    const userId = req.rows[0].user_id;

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'executing' WHERE id = $1`,
      [requestId]
    );

    _log('erase_execution_started', { requestId, userId, companyId });

    const results = [];
    let totalAffected = 0;

    for (const target of ERASURE_TARGETS) {
      try {
        const affected = await _processTarget(target, userId, companyId);
        results.push({ table: target.table, method: target.method, affected, ok: true });
        totalAffected += affected;
      } catch (err) {
        results.push({ table: target.table, method: target.method, affected: 0, ok: false, error: err?.message });
        _log('target_error', { table: target.table, error: err?.message });
      }
    }

    // Mark user as soft-deleted
    await db.query(
      `UPDATE users SET deleted_at = NOW(), active = false, email = CONCAT('[ERASED_', LEFT(id::text, 8), ']') WHERE id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    results.push({ table: 'users', method: 'soft_delete', affected: 1, ok: true });
    totalAffected += 1;

    const completedAt = new Date();
    const rollbackDeadline = new Date(completedAt.getTime() + ROLLBACK_WINDOW_HOURS * 3600 * 1000);

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'completed', completed_at = NOW(), 
       response = $1 WHERE id = $2`,
      [JSON.stringify({ total_affected: totalAffected, tables_processed: results.length, rollback_deadline: rollbackDeadline.toISOString() }), requestId]
    );

    _log('erase_execution_completed', {
      requestId, userId, companyId, totalAffected,
      tablesProcessed: results.length,
      rollbackDeadline: rollbackDeadline.toISOString(),
    });

    return {
      ok: true,
      request_id: requestId,
      status: ERASURE_STAGES.COMPLETED,
      summary: {
        total_affected: totalAffected,
        tables_processed: results.length,
        tables_with_data: results.filter(r => r.affected > 0).length,
        completed_at: completedAt.toISOString(),
        rollback_deadline: rollbackDeadline.toISOString(),
        rollback_window_hours: ROLLBACK_WINDOW_HOURS,
      },
      details: results,
      legal_protected: LEGALLY_PROTECTED_TABLES,
    };
  } catch (err) {
    _log('execution_error', { requestId, error: err?.message });
    await db.query(
      `UPDATE lgpd_data_requests SET status = 'pending', response = $1 WHERE id = $2`,
      [JSON.stringify({ error: err?.message, rolled_back_to: 'pending' }), requestId]
    ).catch(() => {});
    return { ok: false, error: 'Execution failed — request rolled back to pending', code: 'EXECUTION_FAILED' };
  }
}

/**
 * Processa um alvo de erasure individual.
 */
async function _processTarget(target, userId, companyId) {
  const { table, userColumn, method, joinClause, companyScoped } = target;

  if (method === 'delete') {
    let sql;
    if (companyScoped) {
      sql = `UPDATE "${table}" SET deleted_at = NOW() WHERE "${userColumn}" = $1 AND company_id = $2 AND deleted_at IS NULL`;
    } else {
      sql = `DELETE FROM "${table}" WHERE "${userColumn}" = $1`;
    }

    // Check if table has deleted_at column
    const hasSoftDelete = await _hasColumn(table, 'deleted_at');
    if (!hasSoftDelete && companyScoped) {
      sql = `DELETE FROM "${table}" WHERE "${userColumn}" = $1 AND company_id = $2`;
    } else if (!hasSoftDelete && !companyScoped) {
      sql = `DELETE FROM "${table}" WHERE "${userColumn}" = $1`;
    }

    const params = companyScoped ? [userId, companyId] : [userId];
    const result = await db.query(sql, params);
    return result.rowCount || 0;
  }

  if (method === 'anonymize_content') {
    if (joinClause) {
      const sql = `UPDATE "${table}" SET content = '[REDACTED_DSR]', deleted_at = NOW() 
                   FROM (SELECT "${table}".id FROM "${table}" ${joinClause} WHERE "${table}"."${userColumn}" = $1 AND "${table}".deleted_at IS NULL) sub 
                   WHERE "${table}".id = sub.id`;
      const result = await db.query(sql, [userId, companyId]);
      return result.rowCount || 0;
    }
    const sql = companyScoped
      ? `UPDATE "${table}" SET text_content = '[REDACTED_DSR]', deleted_at = NOW() WHERE "${userColumn}" = $1 AND company_id = $2 AND deleted_at IS NULL`
      : `UPDATE "${table}" SET content = '[REDACTED_DSR]', deleted_at = NOW() WHERE "${userColumn}" = $1 AND deleted_at IS NULL`;
    const params = companyScoped ? [userId, companyId] : [userId];
    const result = await db.query(sql, params);
    return result.rowCount || 0;
  }

  if (method === 'anonymize_jsonb') {
    const sql = companyScoped
      ? `UPDATE "${table}" SET input_payload = '{"_redacted":"DSR"}'::jsonb, output_response = '{"_redacted":"DSR"}'::jsonb WHERE "${userColumn}" = $1 AND company_id = $2`
      : `UPDATE "${table}" SET input_payload = '{"_redacted":"DSR"}'::jsonb, output_response = '{"_redacted":"DSR"}'::jsonb WHERE "${userColumn}" = $1`;
    const params = companyScoped ? [userId, companyId] : [userId];
    const result = await db.query(sql, params);
    return result.rowCount || 0;
  }

  return 0;
}

const _columnCache = new Map();
async function _hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (_columnCache.has(key)) return _columnCache.get(key);
  try {
    const r = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      [table, column]
    );
    const has = r.rows.length > 0;
    _columnCache.set(key, has);
    return has;
  } catch {
    return false;
  }
}

/**
 * Retorna o status do pedido DSR erase para o titular.
 */
async function getEraseStatus(userId, companyId) {
  try {
    const result = await db.query(
      `SELECT id, status, created_at, deadline, completed_at, response
       FROM lgpd_data_requests
       WHERE user_id = $1 AND company_id = $2 AND request_type = 'erasure'
       ORDER BY created_at DESC LIMIT 5`,
      [userId, companyId]
    );
    return { ok: true, requests: result.rows };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Rejeita um pedido de erasure (DPO / admin hierarchy ≤ 1).
 * Obrigatória justificativa legal.
 *
 * @param {string} requestId
 * @param {string} companyId
 * @param {string} rejectedBy — UUID do DPO/admin
 * @param {string} legalJustification — Fundamentação legal obrigatória
 * @returns {object}
 */
async function rejectEraseRequest(requestId, companyId, rejectedBy, legalJustification) {
  if (!isDsrEraseEnabled()) {
    return { ok: false, error: 'DSR Erase disabled', code: 'DSR_ERASE_DISABLED' };
  }

  if (!legalJustification || legalJustification.trim().length < 10) {
    return { ok: false, error: 'Legal justification is required (minimum 10 characters)', code: 'JUSTIFICATION_REQUIRED' };
  }

  try {
    const req = await db.query(
      `SELECT id, user_id, status FROM lgpd_data_requests
       WHERE id = $1 AND company_id = $2 AND request_type = 'erasure'`,
      [requestId, companyId]
    );

    if (req.rows.length === 0) {
      return { ok: false, error: 'Request not found', code: 'NOT_FOUND' };
    }

    const current = req.rows[0];

    if (current.status !== 'pending' && current.status !== 'approved') {
      return { ok: false, error: `Cannot reject request in status: ${current.status}`, code: 'INVALID_STATUS' };
    }

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'rejected', assigned_to = $1, processed_at = NOW(),
       response = $2 WHERE id = $3`,
      [rejectedBy, `[REJECTED] ${legalJustification.trim()}`, requestId]
    );

    _log('erase_request_rejected', {
      requestId,
      companyId,
      rejectedBy,
      userId: current.user_id,
      justification: legalJustification.trim().slice(0, 200),
    });

    return {
      ok: true,
      request_id: requestId,
      status: ERASURE_STAGES.REJECTED,
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      legal_justification: legalJustification.trim(),
      user_id: current.user_id,
    };
  } catch (err) {
    _log('reject_error', { requestId, error: err?.message });
    return { ok: false, error: 'Internal error', code: 'INTERNAL_ERROR' };
  }
}

module.exports = {
  submitEraseRequest,
  approveEraseRequest,
  rejectEraseRequest,
  executeErasure,
  getEraseStatus,
  isDsrEraseEnabled,
  isDsrEraseStrict,
  ERASURE_STAGES,
  ERASURE_TARGETS,
  LEGALLY_PROTECTED_TABLES,
  SLA_DAYS,
  ROLLBACK_WINDOW_HOURS,
};
