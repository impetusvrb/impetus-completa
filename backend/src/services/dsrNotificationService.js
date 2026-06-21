'use strict';

/**
 * DSR Notification Service — Non-blocking notifications for DSR lifecycle events
 *
 * Emite notificações ao titular em cada fase do fluxo DSR:
 *   - SUBMIT: pedido recebido
 *   - APPROVED: pedido aprovado (DPO)
 *   - EXECUTED: dados exportados/erasados
 *   - REJECTED: pedido rejeitado (com justificativa legal)
 *   - SLA_APPROACHING: D-3 antes do deadline
 *
 * Garantias:
 *   - Non-blocking: nunca impede o fluxo principal
 *   - Retry-safe: INSERT com ON CONFLICT para idempotência
 *   - Multi-tenant: scoped por company_id
 *   - Structured logging para observabilidade
 */

const db = require('../db');

const DSR_NOTIFICATION_TYPES = Object.freeze({
  EXPORT_SUBMITTED: 'dsr_export_submitted',
  EXPORT_APPROVED: 'dsr_export_approved',
  EXPORT_EXECUTED: 'dsr_export_executed',
  EXPORT_REJECTED: 'dsr_export_rejected',
  ERASE_SUBMITTED: 'dsr_erase_submitted',
  ERASE_APPROVED: 'dsr_erase_approved',
  ERASE_EXECUTED: 'dsr_erase_executed',
  ERASE_REJECTED: 'dsr_erase_rejected',
  SLA_APPROACHING: 'dsr_sla_approaching',
});

const PRIORITY_MAP = Object.freeze({
  [DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED]: 'medium',
  [DSR_NOTIFICATION_TYPES.EXPORT_APPROVED]: 'high',
  [DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED]: 'high',
  [DSR_NOTIFICATION_TYPES.EXPORT_REJECTED]: 'high',
  [DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED]: 'high',
  [DSR_NOTIFICATION_TYPES.ERASE_APPROVED]: 'high',
  [DSR_NOTIFICATION_TYPES.ERASE_EXECUTED]: 'critical',
  [DSR_NOTIFICATION_TYPES.ERASE_REJECTED]: 'high',
  [DSR_NOTIFICATION_TYPES.SLA_APPROACHING]: 'critical',
});

const TITLES = Object.freeze({
  [DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED]: 'Pedido de exportação de dados recebido',
  [DSR_NOTIFICATION_TYPES.EXPORT_APPROVED]: 'Pedido de exportação aprovado',
  [DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED]: 'Exportação de dados concluída',
  [DSR_NOTIFICATION_TYPES.EXPORT_REJECTED]: 'Pedido de exportação rejeitado',
  [DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED]: 'Pedido de exclusão de dados recebido',
  [DSR_NOTIFICATION_TYPES.ERASE_APPROVED]: 'Pedido de exclusão aprovado',
  [DSR_NOTIFICATION_TYPES.ERASE_EXECUTED]: 'Exclusão de dados concluída',
  [DSR_NOTIFICATION_TYPES.ERASE_REJECTED]: 'Pedido de exclusão rejeitado',
  [DSR_NOTIFICATION_TYPES.SLA_APPROACHING]: '⚠ Prazo LGPD próximo do vencimento',
});

function _log(event, data) {
  try {
    console.info('[DSR_NOTIFICATION]', JSON.stringify({ _type: 'dsr_notification', event, ts: new Date().toISOString(), ...data }));
  } catch { /* never throw */ }
}

/**
 * Emite notificação DSR ao titular.
 * Non-blocking — retorna imediatamente sem throw.
 *
 * @param {object} params
 * @param {string} params.userId - UUID do titular
 * @param {string} params.companyId - UUID da empresa
 * @param {string} params.type - DSR_NOTIFICATION_TYPES.*
 * @param {string} params.requestId - UUID do request LGPD
 * @param {string} [params.message] - Mensagem customizada (override default)
 * @param {string} [params.actionUrl] - URL de acção
 * @param {Date} [params.deadline] - Deadline para acção (SLA)
 */
async function notify(params) {
  const { userId, companyId, type, requestId, message, actionUrl, deadline } = params;

  if (!userId || !companyId || !type) {
    _log('notify_skip', { reason: 'missing_params', userId, companyId, type });
    return { ok: false, reason: 'missing_params' };
  }

  const priority = PRIORITY_MAP[type] || 'medium';

  try {
    const result = await _dispatchDsrNotify({
      userId,
      companyId,
      type,
      requestId,
      message,
      actionUrl,
      deadline
    });

    if (result.ok) {
      _log('notify_sent', { userId, companyId, type, requestId, priority });
    } else {
      _log('notify_error', { userId, companyId, type, error: result.error || result.reason });
    }

    return result;
  } catch (err) {
    _log('notify_error', { userId, companyId, type, error: err?.message });
    return { ok: false, error: err?.message };
  }
}

/**
 * Notifica DPO/admins sobre pedido DSR que precisa de acção.
 * Envia para todos users com hierarchy_level <= 1 no mesmo tenant.
 */
async function notifyDpoTeam(params) {
  const { companyId, type, requestId, subjectName, message } = params;

  if (!companyId || !type) return { ok: false, reason: 'missing_params' };

  try {
    const admins = await db.query(
      `SELECT id FROM users WHERE company_id = $1 AND hierarchy_level <= 1 AND active = true AND deleted_at IS NULL`,
      [companyId]
    );

    let sent = 0;
    for (const admin of admins.rows) {
      const result = await notify({
        userId: admin.id,
        companyId,
        type,
        requestId,
        message: message || `Pedido DSR de ${subjectName || 'titular'} requer atenção. ID: ${requestId?.slice(0, 8) || '?'}`,
        actionUrl: `/admin/lgpd/requests/${requestId}`,
      });
      if (result.ok) sent++;
    }

    _log('dpo_team_notified', { companyId, type, requestId, admins_found: admins.rows.length, sent });
    return { ok: true, sent, total: admins.rows.length };
  } catch (err) {
    _log('dpo_notify_error', { companyId, type, error: err?.message });
    return { ok: false, error: err?.message };
  }
}

/**
 * Scanner de SLA approaching (D-3).
 * Busca requests pendentes/aprovados cujo deadline é <= 3 dias no futuro.
 * Idempotente: não notifica se já existe notificação SLA_APPROACHING para o mesmo request.
 */
async function scanSlaApproaching() {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const approaching = await db.query(`
      SELECT r.id, r.user_id, r.company_id, r.request_type, r.deadline, r.status
      FROM lgpd_data_requests r
      WHERE r.status IN ('pending', 'approved')
      AND r.deadline <= $1
      AND r.deadline > NOW()
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.related_entity_id = r.id
        AND n.type = $2
        AND n.created_at > (NOW() - INTERVAL '3 days')
      )
    `, [threeDaysFromNow, DSR_NOTIFICATION_TYPES.SLA_APPROACHING]);

    let notified = 0;
    for (const req of approaching.rows) {
      const daysLeft = Math.ceil((new Date(req.deadline) - Date.now()) / (86400000));

      await notify({
        userId: req.user_id,
        companyId: req.company_id,
        type: DSR_NOTIFICATION_TYPES.SLA_APPROACHING,
        requestId: req.id,
        message: `Seu pedido LGPD (${req.request_type}) vence em ${daysLeft} dia(s). Deadline: ${new Date(req.deadline).toLocaleDateString('pt-BR')}`,
        deadline: req.deadline,
      });

      await notifyDpoTeam({
        companyId: req.company_id,
        type: DSR_NOTIFICATION_TYPES.SLA_APPROACHING,
        requestId: req.id,
        message: `Pedido LGPD ${req.request_type} (${req.id.slice(0, 8)}) vence em ${daysLeft} dia(s). Ação necessária.`,
      });

      notified++;
    }

    _log('sla_scan_completed', { found: approaching.rows.length, notified });
    return { ok: true, found: approaching.rows.length, notified };
  } catch (err) {
    _log('sla_scan_error', { error: err?.message });
    return { ok: false, error: err?.message };
  }
}

function _buildDefaultMessage(type, requestId) {
  const ref = requestId ? ` (Ref: ${requestId.slice(0, 8)})` : '';
  switch (type) {
    case DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED:
      return `Seu pedido de exportação de dados foi registado e será analisado dentro do prazo legal.${ref}`;
    case DSR_NOTIFICATION_TYPES.EXPORT_APPROVED:
      return `Seu pedido de exportação foi aprovado e será processado em breve.${ref}`;
    case DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED:
      return `A exportação dos seus dados pessoais foi concluída com sucesso.${ref}`;
    case DSR_NOTIFICATION_TYPES.EXPORT_REJECTED:
      return `Seu pedido de exportação foi rejeitado. Verifique a justificativa legal.${ref}`;
    case DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED:
      return `Seu pedido de exclusão de dados foi registado e será analisado pelo DPO.${ref}`;
    case DSR_NOTIFICATION_TYPES.ERASE_APPROVED:
      return `Seu pedido de exclusão foi aprovado e será executado em breve.${ref}`;
    case DSR_NOTIFICATION_TYPES.ERASE_EXECUTED:
      return `A exclusão dos seus dados pessoais foi concluída. Período de reversibilidade: 72h.${ref}`;
    case DSR_NOTIFICATION_TYPES.ERASE_REJECTED:
      return `Seu pedido de exclusão foi rejeitado. Verifique a justificativa legal.${ref}`;
    default:
      return `Actualização no seu pedido LGPD.${ref}`;
  }
}

/**
 * Conteúdo normalizado para INSERT em notifications (usado pelo adapter EG-09).
 * @param {object} params
 */
function buildNotificationContent(params) {
  const { type, requestId, message, actionUrl, deadline } = params;
  const title = TITLES[type] || 'Notificação LGPD';
  const priority = PRIORITY_MAP[type] || 'medium';
  const finalMessage = message || _buildDefaultMessage(type, requestId);
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  return {
    title,
    priority,
    finalMessage,
    actionRequired: type === DSR_NOTIFICATION_TYPES.SLA_APPROACHING,
    actionUrl: actionUrl || null,
    actionDeadline: deadline || null,
    expiresAt: expires
  };
}

/**
 * EG-09 — delega distribuição ao adapter (shadow/migrado) com fallback legado.
 * @param {object} params
 * @returns {Promise<{ ok: boolean, reason?: string, error?: string }>}
 */
async function _dispatchDsrNotify(params) {
  try {
    const adapter = require('./governanceAdapters/dsrGovernanceAdapter');
    const dispatch = await adapter.dispatchDsrNotification(params);
    if (dispatch.mode === 'governance' && dispatch.distribution?.success) {
      return { ok: true };
    }
    if (dispatch.useLegacy !== false) {
      return adapter.runLegacyDistribution(params);
    }
    return { ok: false, reason: dispatch.reason || 'dispatch_failed' };
  } catch (err) {
    console.warn('[DSR_NOTIFICATION][governance_dispatch]', err?.message ?? err);
    try {
      const adapter = require('./governanceAdapters/dsrGovernanceAdapter');
      return adapter.runLegacyDistribution(params);
    } catch (fallbackErr) {
      console.error('[DSR_NOTIFICATION][legacy_fallback]', fallbackErr?.message ?? fallbackErr);
      return { ok: false, error: fallbackErr?.message };
    }
  }
}

// SLA scheduler (non-blocking, runs every 6h)
let _slaInterval = null;
function startSlaScheduler(intervalMs = 6 * 3600 * 1000) {
  if (_slaInterval) return false;
  _slaInterval = setInterval(() => {
    scanSlaApproaching().catch(() => {});
  }, intervalMs);
  if (_slaInterval.unref) _slaInterval.unref();
  _log('sla_scheduler_started', { interval_ms: intervalMs });
  return true;
}

module.exports = {
  DSR_NOTIFICATION_TYPES,
  buildNotificationContent,
  notify,
  notifyDpoTeam,
  scanSlaApproaching,
  startSlaScheduler,
};
