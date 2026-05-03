'use strict';

/**
 * Rotas operacionais — confirmação explícita de propostas (ex.: system_influence no chat).
 * POST /api/operational/confirm-action
 *
 * Política: sem acções destrutivas; efeitos apenas via operationalActionExecutor (notificação / tarefa / logs).
 */

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { executeOperationalActions } = require('../services/operationalActionExecutor');
const strategicLearningService = require('../services/strategicLearningService');
const { checkUserRateLimit } = require('../services/unifiedRateLimitService');
const { isValidUUID } = require('../utils/security');

const router = express.Router();

/** Alinhado a buildSystemInfluenceMessage (dashboard.js). */
const ALLOWED_TYPES = new Set(['critical_action_proposal', 'attention_action_proposal']);
const ALLOWED_SEVERITY = new Set(['high', 'medium']);

const DEDUPE_MS = 45_000;
const _dedupe = new Map();

function dedoupeKey(userId, companyId, type, severity) {
  return `${String(userId)}:${String(companyId)}:${type}:${severity}`;
}

function isDuplicateConfirm(key, now) {
  const prev = _dedupe.get(key);
  return prev != null && now - prev < DEDUPE_MS;
}

function markConfirmDedupe(key, now) {
  _dedupe.set(key, now);
  if (_dedupe.size > 2000) {
    const cutoff = now - DEDUPE_MS * 2;
    for (const [k, ts] of _dedupe) {
      if (ts < cutoff) _dedupe.delete(k);
    }
  }
}

const ROLLBACK_ID_CAP = 32;

/**
 * Extrai identificadores reversíveis a partir do resultado do operationalActionExecutor.
 * Formato real: review_task | scheduled_task → meta.task_id; internal_alert → meta.alert_id;
 * notification → meta.notificationId.
 * @param {object[]} executed
 * @returns {{ created_task_ids: string[], alert_ids: string[], notification_ids: string[] }}
 */
function buildRollbackContext(executed) {
  const list = Array.isArray(executed) ? executed : [];
  const created_task_ids = [];
  const alert_ids = [];
  const notification_ids = [];

  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const t = e.type != null ? String(e.type) : '';
    const meta = e.meta && typeof e.meta === 'object' ? e.meta : {};

    if (t === 'review_task' || t === 'scheduled_task') {
      const tid = meta.task_id != null ? String(meta.task_id).trim() : '';
      if (isValidUUID(tid) && created_task_ids.length < ROLLBACK_ID_CAP) {
        created_task_ids.push(tid);
      }
    } else if (t === 'internal_alert') {
      const aid = meta.alert_id != null ? String(meta.alert_id).trim() : '';
      if (isValidUUID(aid) && alert_ids.length < ROLLBACK_ID_CAP) {
        alert_ids.push(aid);
      }
    } else if (t === 'notification') {
      const nid =
        meta.notificationId != null
          ? String(meta.notificationId).trim()
          : meta.notification_id != null
            ? String(meta.notification_id).trim()
            : '';
      if (isValidUUID(nid) && notification_ids.length < ROLLBACK_ID_CAP) {
        notification_ids.push(nid);
      }
    }
  }

  return { created_task_ids, alert_ids, notification_ids };
}

function normalizeUuidArray(raw, max = ROLLBACK_ID_CAP) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) {
    if (out.length >= max) break;
    const s = x != null ? String(x).trim() : '';
    if (isValidUUID(s)) out.push(s);
  }
  return out;
}

router.post('/confirm-action', requireAuth, async (req, res) => {
  const user = req.user;

  try {
    if (!user?.id || !user.company_id) {
      return res.status(403).json({ ok: false, error: 'INVALID_USER' });
    }

    const rawType = req.body?.type != null ? String(req.body.type).trim() : '';
    const rawSeverity = req.body?.severity != null ? String(req.body.severity).trim().toLowerCase() : '';

    const type = rawType.slice(0, 160);
    const severity = rawSeverity.slice(0, 32);

    if (!type || !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ ok: false, error: 'INVALID_TYPE' });
    }
    if (!severity || !ALLOWED_SEVERITY.has(severity)) {
      return res.status(400).json({ ok: false, error: 'INVALID_SEVERITY' });
    }

    if (!checkUserRateLimit(user.id, 'operational_confirm')) {
      console.warn('[RATE_LIMIT_BLOCKED]', String(user.id), 'operational_confirm');
      return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' });
    }

    const dk = dedoupeKey(user.id, user.company_id, type, severity);
    const now = Date.now();
    if (isDuplicateConfirm(dk, now)) {
      try {
        await logAction({
          companyId: user.company_id,
          userId: user.id,
          userName: user.name || user.email,
          userRole: user.role,
          action: 'operational_confirm_action_deduped',
          entityType: 'system_influence',
          entityId: type.slice(0, 120),
          description: 'Confirmação ignorada: duplicada na janela de deduplicação.',
          changes: { type, severity },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: null,
          severity: 'info',
          success: true
        });
      } catch (_a) {
        /* auditoria best-effort */
      }
      return res.json({
        ok: true,
        deduplicated: true,
        executed: [],
        skipped: [{ reason: 'duplicate_within_window', window_ms: DEDUPE_MS }],
        errors: [],
        rollback_context: { created_task_ids: [], alert_ids: [], notification_ids: [] },
        rollback_note:
          'Pedido idempotente: mesma confirmação foi recebida há instantes; nenhuma ação adicional executada.'
      });
    }

    try {
      console.info(
        '[OPERATIONAL_CONFIRM_START]',
        JSON.stringify({
          user_id: user.id,
          company_id: user.company_id,
          type,
          severity
        })
      );
    } catch (_log) {
      /* ignore */
    }

    strategicLearningService.recordDecisionTraceAsync({
      company_id: user.company_id,
      intent: 'user_confirmed_system_influence',
      had_data: true,
      used_fallback: false,
      context_tags: [type, severity, 'chat_confirmation']
    });

    const evaluation = {
      triggers: [],
      alerts: [
        {
          code: type,
          severity,
          kind: 'suggestion_only',
          message: `Confirmação explícita no chat Impetus (system_influence): ${type}`
        }
      ],
      recommended_actions: []
    };

    const result = await executeOperationalActions(evaluation, {
      user,
      companyId: String(user.company_id),
      userId: user.id,
      sourceTag: 'chat_system_influence_confirm',
      intent: 'user_confirmed_operational_proposal'
    });

    const executed = Array.isArray(result.executed) ? result.executed : [];
    const skipped = Array.isArray(result.skipped) ? result.skipped : [];
    const errors = Array.isArray(result.errors) ? result.errors : [];
    const rollback_context = buildRollbackContext(executed);

    try {
      await logAction({
        companyId: user.company_id,
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: 'operational_confirm_action',
        entityType: 'system_influence',
        entityId: type.slice(0, 120),
        description: `Utilizador confirmou proposta operacional (${severity}): ${type}`,
        changes: {
          type,
          severity,
          executed_count: executed.length,
          skipped_count: skipped.length,
          errors_count: errors.length,
          rollback_context
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: null,
        severity: errors.length ? 'warning' : 'info',
        success: errors.length === 0 || executed.length > 0
      });
    } catch (_audit) {
      /* não falhar resposta */
    }

    try {
      console.info(
        '[OPERATIONAL_CONFIRM_SUCCESS]',
        JSON.stringify({
          user_id: user.id,
          company_id: user.company_id,
          executed: executed.length,
          skipped: skipped.length,
          errors: errors.length
        })
      );
    } catch (_log) {
      /* ignore */
    }

    markConfirmDedupe(dk, Date.now());

    return res.json({
      ok: true,
      executed,
      skipped,
      errors,
      rollback_context,
      rollback_note:
        'Nenhum rollback automático. Para desfazer efeitos suportados (tarefas em aberto, alertas internos não resolvidos, notificações próprias), guarde `rollback_context` e invoque POST /api/operational/rollback-action quando for apropriado.'
    });
  } catch (err) {
    console.error('[OPERATIONAL_CONFIRM_FAIL]', err?.message ?? err);
    try {
      if (user?.company_id && user?.id) {
        await logAction({
          companyId: user.company_id,
          userId: user.id,
          userName: user.name || user.email,
          userRole: user.role,
          action: 'operational_confirm_action',
          entityType: 'system_influence',
          entityId: 'error',
          description: 'Falha na execução da confirmação operacional.',
          changes: { error: String(err?.message || err).slice(0, 500) },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: null,
          severity: 'error',
          success: false,
          errorMessage: err?.message ? String(err.message).slice(0, 500) : null
        });
      }
    } catch (_a) {
      /* ignore */
    }
    return res.status(500).json({
      ok: false,
      error: 'ACTION_EXECUTION_FAILED'
    });
  }
});

/**
 * Rollback controlado (explícito) — não é invocado automaticamente.
 * - Tarefas: status → cancelled (abertas; mesma empresa; preferencialmente atribuídas ao utilizador).
 * - Alertas operacionais: marca resolvido (UUID, mesma empresa).
 * - Notificações app: read_at preenchido (destinatário = utilizador; mesma empresa).
 */
router.post('/rollback-action', requireAuth, async (req, res) => {
  const user = req.user;

  try {
    if (!user?.id || !user.company_id) {
      return res.status(403).json({ ok: false, error: 'INVALID_USER' });
    }

    const raw = req.body?.rollback_context;
    if (!raw || typeof raw !== 'object') {
      return res.status(400).json({ ok: false, error: 'INVALID_CONTEXT' });
    }

    const created_task_ids = normalizeUuidArray(raw.created_task_ids);
    const alert_ids = normalizeUuidArray(raw.alert_ids);
    const notification_ids = normalizeUuidArray(raw.notification_ids);

    if (created_task_ids.length === 0 && alert_ids.length === 0 && notification_ids.length === 0) {
      return res.status(400).json({ ok: false, error: 'EMPTY_ROLLBACK_CONTEXT' });
    }

    if (!checkUserRateLimit(user.id, 'operational_rollback')) {
      console.warn('[RATE_LIMIT_BLOCKED]', String(user.id), 'operational_rollback');
      return res.status(429).json({ ok: false, error: 'RATE_LIMIT_EXCEEDED' });
    }

    try {
      console.warn(
        '[OPERATIONAL_ROLLBACK_START]',
        JSON.stringify({
          user_id: user.id,
          company_id: user.company_id,
          tasks: created_task_ids.length,
          alerts: alert_ids.length,
          notifications: notification_ids.length
        })
      );
    } catch (_log) {
      /* ignore */
    }

    strategicLearningService.recordDecisionTraceAsync({
      company_id: user.company_id,
      intent: 'user_rollback_operational_confirm',
      had_data: true,
      used_fallback: false,
      context_tags: [
        `tasks:${created_task_ids.length}`,
        `alerts:${alert_ids.length}`,
        `notif:${notification_ids.length}`
      ]
    });

    let tasks_cancelled = 0;
    let alerts_resolved = 0;
    let notifications_marked_read = 0;

    if (created_task_ids.length) {
      const rT = await db.query(
        `
        UPDATE tasks
        SET status = 'cancelled'
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND (assigned_to IS NULL OR assigned_to = $3::uuid)
          AND COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
        `,
        [created_task_ids, user.company_id, user.id]
      );
      tasks_cancelled = rT.rowCount || 0;
    }

    if (alert_ids.length) {
      const rA = await db.query(
        `
        UPDATE operational_alerts
        SET
          resolvido = true,
          resolvido_por = $3::uuid,
          resolvido_em = now()
        WHERE id = ANY($1::uuid[])
          AND company_id = $2::uuid
          AND COALESCE(resolvido, false) = false
        `,
        [alert_ids, user.company_id, user.id]
      );
      alerts_resolved = rA.rowCount || 0;
    }

    if (notification_ids.length) {
      try {
        const rN = await db.query(
          `
          UPDATE app_notifications
          SET read_at = COALESCE(read_at, now())
          WHERE id = ANY($1::uuid[])
            AND company_id = $2::uuid
            AND recipient_id = $3::uuid
          `,
          [notification_ids, user.company_id, user.id]
        );
        notifications_marked_read = rN.rowCount || 0;
      } catch (notifErr) {
        if (notifErr && notifErr.message && String(notifErr.message).includes('company_id')) {
          const rN2 = await db.query(
            `
            UPDATE app_notifications
            SET read_at = COALESCE(read_at, now())
            WHERE id = ANY($1::uuid[])
              AND recipient_id = $2::uuid
            `,
            [notification_ids, user.id]
          );
          notifications_marked_read = rN2.rowCount || 0;
        } else {
          throw notifErr;
        }
      }
    }

    try {
      await logAction({
        companyId: user.company_id,
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: 'operational_rollback_action',
        entityType: 'operational_execution',
        entityId: 'rollback',
        description: 'Rollback controlado após confirmação operacional (tarefas / alertas / notificações).',
        changes: {
          rollback_context: { created_task_ids, alert_ids, notification_ids },
          tasks_cancelled,
          alerts_resolved,
          notifications_marked_read
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: null,
        severity: 'info',
        success: true
      });
    } catch (_audit) {
      /* best-effort */
    }

    try {
      console.warn(
        '[OPERATIONAL_ROLLBACK_SUCCESS]',
        JSON.stringify({
          user_id: user.id,
          company_id: user.company_id,
          tasks_cancelled,
          alerts_resolved,
          notifications_marked_read
        })
      );
    } catch (_log) {
      /* ignore */
    }

    return res.json({
      ok: true,
      tasks_cancelled,
      alerts_resolved,
      notifications_marked_read,
      rollback_note:
        'Comunicações já entregues ou outliers não cobertos por estes IDs podem permanecer visíveis em histórico; não há remoção física de mensagens.'
    });
  } catch (err) {
    console.error('[OPERATIONAL_ROLLBACK_FAIL]', err?.message ?? err);
    try {
      if (user?.company_id && user?.id) {
        await logAction({
          companyId: user.company_id,
          userId: user.id,
          userName: user.name || user.email,
          userRole: user.role,
          action: 'operational_rollback_action',
          entityType: 'operational_execution',
          entityId: 'rollback_error',
          description: 'Falha no rollback operacional controlado.',
          changes: {
            rollback_context: req.body?.rollback_context || null,
            error: String(err?.message || err).slice(0, 500)
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: null,
          severity: 'error',
          success: false,
          errorMessage: err?.message ? String(err.message).slice(0, 500) : null
        });
      }
    } catch (_a) {
      /* ignore */
    }
    return res.status(500).json({ ok: false, error: 'ROLLBACK_FAILED' });
  }
});

module.exports = router;
