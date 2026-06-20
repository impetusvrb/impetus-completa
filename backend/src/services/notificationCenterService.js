'use strict';

/**
 * Notification Center — leitura, contagem e mark-read (AUD-NOTIFICATION-CENTER-02-FIX).
 * Reutiliza tabela app_notifications existente; sem nova arquitetura.
 */

const db = require('../db');
const { isValidUUID } = require('../utils/security');
const observability = require('./observabilityService');

const METRIC_ATTEMPTS = 'notification_delivery_attempts';
const METRIC_SUCCESS = 'notification_delivery_success';
const METRIC_MARK_READ = 'notification_mark_read';

function recordDeliveryAttempt() {
  observability.incrementMetric(METRIC_ATTEMPTS);
}

function recordDeliverySuccess() {
  observability.incrementMetric(METRIC_SUCCESS);
}

function recordMarkRead() {
  observability.incrementMetric(METRIC_MARK_READ);
}

/**
 * @param {string} userId
 * @param {string} companyId
 * @param {{ limit?: number, offset?: number, unreadOnly?: boolean }} opts
 */
async function listForUser(userId, companyId, opts = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(String(opts.limit || 15), 10) || 15));
  const offset = Math.max(0, parseInt(String(opts.offset || 0), 10) || 0);
  const unreadOnly = opts.unreadOnly === true;

  const params = [userId, companyId, unreadOnly, limit, offset];
  try {
    const r = await db.query(
      `
      SELECT id, text_content, communication_id, sent_at, read_at
      FROM app_notifications
      WHERE recipient_id = $1::uuid
        AND company_id = $2::uuid
        AND ($3::boolean IS NOT TRUE OR read_at IS NULL)
      ORDER BY sent_at DESC NULLS LAST, id DESC
      LIMIT $4 OFFSET $5
      `,
      params
    );
    return r.rows || [];
  } catch (err) {
    if (err && String(err.message || '').includes('company_id')) {
      const r2 = await db.query(
        `
        SELECT id, text_content, communication_id, sent_at, read_at
        FROM app_notifications
        WHERE recipient_id = $1::uuid
          AND ($2::boolean IS NOT TRUE OR read_at IS NULL)
        ORDER BY sent_at DESC NULLS LAST, id DESC
        LIMIT $3 OFFSET $4
        `,
        [userId, unreadOnly, limit, offset]
      );
      return r2.rows || [];
    }
    throw err;
  }
}

/**
 * @param {string} userId
 * @param {string} companyId
 */
async function getUnreadCount(userId, companyId) {
  try {
    const r = await db.query(
      `
      SELECT COUNT(*)::int AS c
      FROM app_notifications
      WHERE recipient_id = $1::uuid
        AND company_id = $2::uuid
        AND read_at IS NULL
      `,
      [userId, companyId]
    );
    return r.rows[0]?.c ?? 0;
  } catch (err) {
    if (err && String(err.message || '').includes('company_id')) {
      const r2 = await db.query(
        `
        SELECT COUNT(*)::int AS c
        FROM app_notifications
        WHERE recipient_id = $1::uuid AND read_at IS NULL
        `,
        [userId]
      );
      return r2.rows[0]?.c ?? 0;
    }
    throw err;
  }
}

/**
 * @param {string} notificationId
 * @param {string} userId
 * @param {string} companyId
 * @returns {Promise<{ ok: boolean, alreadyRead?: boolean }>}
 */
async function markAsRead(notificationId, userId, companyId) {
  if (!isValidUUID(notificationId)) {
    return { ok: false, error: 'ID inválido' };
  }

  let r;
  try {
    r = await db.query(
      `
      UPDATE app_notifications
      SET read_at = COALESCE(read_at, now())
      WHERE id = $1::uuid
        AND recipient_id = $2::uuid
        AND company_id = $3::uuid
      RETURNING id, read_at
      `,
      [notificationId, userId, companyId]
    );
  } catch (err) {
    if (err && String(err.message || '').includes('company_id')) {
      r = await db.query(
        `
        UPDATE app_notifications
        SET read_at = COALESCE(read_at, now())
        WHERE id = $1::uuid AND recipient_id = $2::uuid
        RETURNING id, read_at
        `,
        [notificationId, userId]
      );
    } else {
      throw err;
    }
  }

  if (!r.rows.length) {
    return { ok: false, error: 'Notificação não encontrada' };
  }

  recordMarkRead();
  return { ok: true, id: r.rows[0].id, read_at: r.rows[0].read_at };
}

/**
 * Status read-only para auditoria (tenant admin).
 * @param {string} [companyId]
 */
async function getAuditStatus(companyId) {
  const metrics = observability.getMetricsSnapshot();
  const attempts = metrics[METRIC_ATTEMPTS] || 0;
  const success = metrics[METRIC_SUCCESS] || 0;
  const markReads = metrics[METRIC_MARK_READ] || 0;

  let unreadNotifications = 0;
  if (companyId) {
    try {
      const r = await db.query(
        `
        SELECT COUNT(*)::int AS c
        FROM app_notifications
        WHERE company_id = $1::uuid AND read_at IS NULL
        `,
        [companyId]
      );
      unreadNotifications = r.rows[0]?.c ?? 0;
    } catch (_e) {
      try {
        const r2 = await db.query(
          `SELECT COUNT(*)::int AS c FROM app_notifications WHERE read_at IS NULL`
        );
        unreadNotifications = r2.rows[0]?.c ?? 0;
      } catch (_e2) {
        unreadNotifications = 0;
      }
    }
  }

  const readRate =
    success > 0 ? Math.min(1, Math.round((markReads / success) * 100) / 100) : 0;

  let unifiedMessaging;
  try {
    unifiedMessaging = require('./unifiedMessagingService');
  } catch (_e) {
    unifiedMessaging = null;
  }

  return {
    socket_enabled: !!(unifiedMessaging && unifiedMessaging.isSocketEnabled && unifiedMessaging.isSocketEnabled()),
    user_room_enabled: true,
    unread_notifications: unreadNotifications,
    delivery_attempts: attempts,
    delivery_success: success,
    mark_read_events: markReads,
    read_rate: readRate
  };
}

module.exports = {
  listForUser,
  getUnreadCount,
  markAsRead,
  getAuditStatus,
  recordDeliveryAttempt,
  recordDeliverySuccess,
  recordMarkRead,
  METRIC_ATTEMPTS,
  METRIC_SUCCESS,
  METRIC_MARK_READ
};
