'use strict';

/**
 * BILLING-NOTIF-02 — notificações progressivas de inadimplência (arquitectura moderna).
 * Dias 3 (email), 5 (App Impetus), 7 (Notification Center).
 * Dedupe: subscription_notifications. Sem suspensão — ver checkGracePeriodAndSuspend().
 */

const db = require('../../db');
const observability = require('../observabilityService');
const { logAction } = require('../../middleware/audit');
const subscriptionRecipientResolver = require('./subscriptionRecipientResolver');
const subscriptionCompanyReader = require('./subscriptionCompanyReader');

const NOTIFICATION_DAYS = Object.freeze([3, 5, 7]);
const NOTIFICATION_TYPES = Object.freeze({
  3: 'email_day3',
  5: 'app_day5',
  7: 'nc_day7'
});

const METRICS = Object.freeze({
  EMAIL_DAY3_ATTEMPT: 'billing_notification_email_day3_attempt',
  EMAIL_DAY3_SUCCESS: 'billing_notification_email_day3_success',
  APP_DAY5_ATTEMPT: 'billing_notification_app_day5_attempt',
  APP_DAY5_SUCCESS: 'billing_notification_app_day5_success',
  NC_DAY7_ATTEMPT: 'billing_notification_nc_day7_attempt',
  NC_DAY7_SUCCESS: 'billing_notification_nc_day7_success'
});

function isEnabled() {
  return String(process.env.ENABLE_BILLING_NOTIFICATIONS || '').toLowerCase() === 'true';
}

function _metric(name) {
  observability.incrementMetric(name);
}

function daysSinceOverdue(overdueSinceDate) {
  if (!overdueSinceDate) return 0;
  const overdue = new Date(overdueSinceDate);
  const now = new Date();
  const diff = (now - overdue) / (24 * 60 * 60 * 1000);
  return Math.floor(diff);
}

async function wasNotificationSent(subscriptionId, notificationType) {
  const r = await db.query(
    `
    SELECT 1 FROM subscription_notifications
    WHERE subscription_id = $1 AND notification_type = $2
    LIMIT 1
    `,
    [subscriptionId, notificationType]
  );
  return r.rows.length > 0;
}

async function recordNotificationSent(subscriptionId, companyId, notificationType, metadata = {}) {
  await db.query(
    `
    INSERT INTO subscription_notifications (
      subscription_id, company_id, notification_type, metadata, sent_at
    ) VALUES ($1, $2, $3, $4, now())
    `,
    [subscriptionId, companyId, notificationType, JSON.stringify(metadata)]
  );
}

function _baseUrl() {
  return (process.env.FRONTEND_URL || process.env.BASE_URL || 'https://app.impetus.com.br').replace(/\/$/, '');
}

async function _findNcDay7Recipients(companyId) {
  const ids = new Set();
  try {
    const r = await db.query(
      `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN tenant_admins ta
        ON ta.user_id = u.id AND ta.company_id = u.company_id AND ta.status = 'active'
      WHERE u.company_id = $1::uuid
        AND u.active = true
        AND u.deleted_at IS NULL
        AND (u.hierarchy_level <= 1 OR ta.user_id IS NOT NULL)
      `,
      [companyId]
    );
    for (const row of r.rows || []) {
      if (row.id) ids.add(row.id);
    }
  } catch (err) {
    if (err && err.code !== '42P01') {
      console.warn('[BILLING_NOTIF][nc_recipients]', err?.message ?? err);
    }
    try {
      const r2 = await db.query(
        `
        SELECT id FROM users
        WHERE company_id = $1::uuid AND active = true AND deleted_at IS NULL
          AND hierarchy_level <= 1
        `,
        [companyId]
      );
      for (const row of r2.rows || []) {
        if (row.id) ids.add(row.id);
      }
    } catch (err2) {
      console.warn('[BILLING_NOTIF][nc_recipients_fallback]', err2?.message ?? err2);
    }
  }

  if (ids.size === 0) {
    try {
      const bridge = require('../notificationBridgeService');
      const fallback = await bridge.findSupervisorNcRecipients(companyId, 5);
      for (const id of fallback) ids.add(id);
    } catch (err) {
      console.warn('[BILLING_NOTIF][nc_bridge_fallback]', err?.message ?? err);
    }
  }

  return [...ids];
}

async function _sendDay3Email(row, days, stats) {
  if (days < 3) return;
  const notifType = NOTIFICATION_TYPES[3];
  if (await wasNotificationSent(row.id, notifType)) return;

  const recipient = await subscriptionRecipientResolver.resolveForCompany(row.company_id);
  if (!recipient.email) return;

  _metric(METRICS.EMAIL_DAY3_ATTEMPT);
  stats.email_day3_attempted += 1;

  const { sendOverdueNotificationEmail } = require('../emailService');
  let sent = false;
  try {
    sent = await sendOverdueNotificationEmail({
      to: recipient.email,
      companyName: row.company_name,
      daysOverdue: days,
      gracePeriodDays: row.grace_period_days || 10,
      dueDate: row.overdue_since_date
    });
  } catch (err) {
    console.error('[BILLING_NOTIF][day3_email]', err?.message ?? err);
  }

  if (sent) {
    _metric(METRICS.EMAIL_DAY3_SUCCESS);
    stats.email_day3_sent += 1;
    await recordNotificationSent(row.id, row.company_id, notifType, {
      daysOverdue: days,
      recipient_source: recipient.source
    });
    await logAction({
      companyId: row.company_id,
      action: 'subscription_notification_day3',
      entityType: 'subscription',
      entityId: row.id,
      description: 'Notificação billing dia 3 (email) enviada',
      severity: 'warning'
    }).catch(() => {});
  }
}

async function _buildDay5Message(companyId) {
  const base = _baseUrl();
  let paymentUrl = null;
  try {
    const asaasService = require('../asaasService');
    paymentUrl = await asaasService.getSubscriptionPaymentLink(companyId);
  } catch (err) {
    console.warn('[BILLING_NOTIF][day5_payment_link]', err?.message ?? err);
  }

  const lines = [
    'Assinatura em atraso.',
    '',
    'O acesso da empresa poderá ser suspenso após o período de carência.',
    '',
    'Regularize a cobrança para evitar interrupções.',
    '',
    `Acesse: ${base}/subscription-expired`
  ];
  if (paymentUrl) {
    lines.push('', `Boleto: ${paymentUrl}`);
  } else {
    lines.push('', 'Obtenha o link de pagamento em GET /api/subscription/payment-link');
  }
  return lines.join('\n');
}

async function _sendDay5App(row, days, stats) {
  if (days < 5) return;
  const notifType = NOTIFICATION_TYPES[5];
  if (await wasNotificationSent(row.id, notifType)) return;

  let phone = '';
  const fromRow = subscriptionRecipientResolver.resolveFromCompanyRow(row.company_row || {});
  phone = fromRow.phone;
  if (!phone) {
    const resolved = await subscriptionRecipientResolver.resolveForCompany(row.company_id);
    phone = resolved.phone;
  }
  if (!phone || String(phone).replace(/\D/g, '').length < 10) return;

  _metric(METRICS.APP_DAY5_ATTEMPT);
  stats.app_day5_attempted += 1;

  const message = await _buildDay5Message(row.company_id);
  let sent = false;
  try {
    const appImpetusService = require('../appImpetusService');
    const result = await appImpetusService.sendMessage(row.company_id, phone, message, {
      originatedFrom: 'subscription'
    });
    sent = result?.ok === true;
  } catch (err) {
    console.error('[BILLING_NOTIF][day5_app]', err?.message ?? err);
  }

  if (sent) {
    _metric(METRICS.APP_DAY5_SUCCESS);
    stats.app_day5_sent += 1;
    await recordNotificationSent(row.id, row.company_id, notifType, { daysOverdue: days });
    await logAction({
      companyId: row.company_id,
      action: 'subscription_notification_day5',
      entityType: 'subscription',
      entityId: row.id,
      description: 'Notificação billing dia 5 (App Impetus) enviada',
      severity: 'warning'
    }).catch(() => {});
  }
}

async function _sendDay7Nc(row, days, stats) {
  if (days < 7) return;
  const notifType = NOTIFICATION_TYPES[7];
  if (await wasNotificationSent(row.id, notifType)) return;

  const recipients = await _findNcDay7Recipients(row.company_id);
  if (!recipients.length) return;

  const message =
    'Empresa com inadimplência superior a 7 dias.\n\n' +
    'A regularização é necessária para evitar suspensão automática.';

  _metric(METRICS.NC_DAY7_ATTEMPT);
  stats.nc_day7_attempted += 1;

  const unifiedMessaging = require('../unifiedMessagingService');
  let sentCount = 0;
  for (const userId of recipients) {
    try {
      const result = await unifiedMessaging.sendToUser(row.company_id, userId, message, {
        type: 'warning'
      });
      if (result?.ok) sentCount += 1;
    } catch (err) {
      console.warn('[BILLING_NOTIF][day7_nc_user]', userId, err?.message ?? err);
    }
  }

  if (sentCount > 0) {
    _metric(METRICS.NC_DAY7_SUCCESS);
    stats.nc_day7_sent += 1;
    await recordNotificationSent(row.id, row.company_id, notifType, {
      daysOverdue: days,
      recipients: sentCount
    });
    await logAction({
      companyId: row.company_id,
      action: 'subscription_notification_day7',
      entityType: 'subscription',
      entityId: row.id,
      description: `Notificação billing dia 7 (NC) enviada para ${sentCount} destinatário(s)`,
      severity: 'warning'
    }).catch(() => {});
  }
}

/**
 * Processa notificações progressivas para assinaturas overdue.
 * @returns {Promise<object>}
 */
async function processBillingNotifications() {
  const stats = {
    enabled: isEnabled(),
    skipped: false,
    subscriptions_processed: 0,
    email_day3_attempted: 0,
    email_day3_sent: 0,
    app_day5_attempted: 0,
    app_day5_sent: 0,
    nc_day7_attempted: 0,
    nc_day7_sent: 0
  };

  if (!isEnabled()) {
    stats.skipped = true;
    return stats;
  }

  const result = await db.query(`
    SELECT s.id, s.company_id, s.overdue_since_date, s.grace_period_days,
           c.name AS company_name
    FROM subscriptions s
    JOIN companies c ON c.id = s.company_id
    WHERE s.status = 'overdue' AND s.overdue_since_date IS NOT NULL
  `);

  for (const sub of result.rows) {
    stats.subscriptions_processed += 1;
    const companyRow = await subscriptionCompanyReader.loadCompanyRow(sub.company_id);
    const row = { ...sub, company_row: companyRow };

    const days = daysSinceOverdue(sub.overdue_since_date);

    await _sendDay3Email(row, days, stats);
    await _sendDay5App(row, days, stats);
    await _sendDay7Nc(row, days, stats);
  }

  return stats;
}

/**
 * Status read-only para auditoria tenant-scoped.
 * @param {string} [companyId]
 */
async function getAuditStatus(companyId) {
  const enabled = isEnabled();

  let subscriptionsOverdue = 0;
  let emailDay3Sent = 0;
  let appDay5Sent = 0;
  let ncDay7Sent = 0;
  let dedupeRecords = 0;

  const params = [];
  let companyFilter = '';
  if (companyId) {
    companyFilter = ' AND company_id = $1';
    params.push(companyId);
  }

  try {
    const overdueQ = companyId
      ? `SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'overdue' AND overdue_since_date IS NOT NULL AND company_id = $1`
      : `SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'overdue' AND overdue_since_date IS NOT NULL`;
    const overdueR = await db.query(overdueQ, companyId ? [companyId] : []);
    subscriptionsOverdue = overdueR.rows[0]?.n ?? 0;

    const dedupeR = await db.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE notification_type = 'email_day3')::int AS email_day3,
        COUNT(*) FILTER (WHERE notification_type = 'app_day5')::int AS app_day5,
        COUNT(*) FILTER (WHERE notification_type = 'nc_day7')::int AS nc_day7
      FROM subscription_notifications
      WHERE 1=1${companyFilter}
      `,
      params
    );
    const d = dedupeR.rows[0] || {};
    dedupeRecords = d.total ?? 0;
    emailDay3Sent = d.email_day3 ?? 0;
    appDay5Sent = d.app_day5 ?? 0;
    ncDay7Sent = d.nc_day7 ?? 0;
  } catch (err) {
    console.warn('[BILLING_NOTIF][audit_status]', err?.message ?? err);
  }

  return {
    enabled,
    flag_active: enabled,
    subscriptions_overdue: subscriptionsOverdue,
    email_day3_sent: emailDay3Sent,
    app_day5_sent: appDay5Sent,
    nc_day7_sent: ncDay7Sent,
    dedupe_records: dedupeRecords
  };
}

module.exports = {
  processBillingNotifications,
  getAuditStatus,
  isEnabled,
  daysSinceOverdue,
  wasNotificationSent,
  recordNotificationSent,
  NOTIFICATION_DAYS,
  NOTIFICATION_TYPES,
  METRICS
};
