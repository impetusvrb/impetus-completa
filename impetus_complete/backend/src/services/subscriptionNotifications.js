/**
 * NOTIFICAÇÕES PROGRESSIVAS DE INADIMPLÊNCIA
 * Bloqueio progressivo B2B: Dia 3 (email), Dia 5 (WhatsApp), Dia 7 (alerta dashboard), Dia 10 (bloqueio)
 * Nunca exclui dados - apenas notifica e bloqueia
 */

const db = require('../db');
const { sendOverdueNotificationEmail } = require('./emailService');
const { logAction } = require('../middleware/audit');
const { SUBSCRIPTION } = require('../constants/messages');

const NOTIFICATION_DAYS = [3, 5, 7];
const NOTIFICATION_TYPES = {
  3: 'email_day3',
  5: 'whatsapp_day5',
  7: 'dashboard_day7'
};

/**
 * Verifica se notificação do tipo já foi enviada para esta assinatura
 */
async function wasNotificationSent(subscriptionId, notificationType) {
  const r = await db.query(`
    SELECT 1 FROM subscription_notifications
    WHERE subscription_id = $1 AND notification_type = $2
    LIMIT 1
  `, [subscriptionId, notificationType]);
  return r.rows.length > 0;
}

/**
 * Registra que a notificação foi enviada
 */
async function recordNotificationSent(subscriptionId, companyId, notificationType, metadata = {}) {
  await db.query(`
    INSERT INTO subscription_notifications (subscription_id, company_id, notification_type, metadata)
    VALUES ($1, $2, $3, $4)
  `, [subscriptionId, companyId, notificationType, JSON.stringify(metadata)]);
}

/**
 * Envia notificação de inadimplência por email (Dia 3)
 */
async function sendDay3Email(company, subscription) {
  const email = company.data_controller_email || company.config?.billing_email;
  if (!email) return false;

  try {
    const sent = await sendOverdueNotificationEmail({
      to: email,
      companyName: company.name,
      daysOverdue: 3,
      gracePeriodDays: subscription.grace_period_days,
      dueDate: subscription.overdue_since_date
    });
    return !!sent;
  } catch (err) {
    console.error('[SUBSCRIPTION_DAY3_EMAIL]', err.message);
    return false;
  }
}

/**
 * Envia notificação por WhatsApp (Dia 5)
 * @param {number} companyId
 * @param {string} companyName
 * @param {string} contactPhone
 * @param {number} [gracePeriodDays=10] - período de carência da assinatura
 */
async function sendDay5WhatsApp(companyId, companyName, contactPhone, gracePeriodDays = 10) {
  const phone = (contactPhone || '').replace(/\D/g, '');
  if (phone.length < 10) return false;

  const diasRestantes = Math.max(0, (gracePeriodDays || 10) - 5);
  const message = SUBSCRIPTION.OVERDUE_WHATSAPP_DAY5(diasRestantes);

  try {
    const toSend = phone.startsWith('55') ? phone : `55${phone}`;
    await require('./appImpetusService').sendMessage(companyId, toSend, message, { originatedFrom: 'subscription' });
    return true;
  } catch (err) {
    console.error('[SUBSCRIPTION_DAY5_WHATSAPP]', err.message);
    return false;
  }
}

/**
 * Marca alerta no dashboard (Dia 7) - flag para exibir banner
 * A verificação é feita no frontend ao carregar (subscription_status = 'overdue' + dias)
 */
async function setDay7DashboardAlert(companyId) {
  try {
    await db.query(`
      UPDATE companies
      SET config = jsonb_set(
        COALESCE(config, '{}'),
        '{overdue_alert_day7}',
        'true'::jsonb
      ),
      updated_at = now()
      WHERE id = $1
    `, [companyId]);
    return true;
  } catch (err) {
    console.error('[SUBSCRIPTION_DAY7_ALERT]', err.message);
    return false;
  }
}

/**
 * Calcula dias desde a data de vencimento
 */
function daysSinceOverdue(overdueSinceDate) {
  if (!overdueSinceDate) return 0;
  const overdue = new Date(overdueSinceDate);
  const now = new Date();
  const diff = (now - overdue) / (24 * 60 * 60 * 1000);
  return Math.floor(diff);
}

/**
 * Processa notificações progressivas para assinaturas em atraso
 */
async function processProgressiveNotifications() {
  const result = await db.query(`
    SELECT s.id, s.company_id, s.overdue_since_date, s.grace_period_days,
           c.name as company_name, c.data_controller_email, c.data_controller_phone, c.config
    FROM subscriptions s
    JOIN companies c ON c.id = s.company_id
    WHERE s.status = 'overdue' AND s.overdue_since_date IS NOT NULL
  `);

  for (const row of result.rows) {
    const days = daysSinceOverdue(row.overdue_since_date);
    const company = {
      name: row.company_name,
      data_controller_email: row.data_controller_email,
      config: row.config || {}
    };
    const subscription = { overdue_since_date: row.overdue_since_date, grace_period_days: row.grace_period_days };

    for (const day of NOTIFICATION_DAYS) {
      if (days < day) continue;

      const notifType = NOTIFICATION_TYPES[day];
      if (await wasNotificationSent(row.id, notifType)) continue;

      let sent = false;
      if (day === 3) {
        sent = await sendDay3Email(company, subscription);
      } else if (day === 5) {
        sent = await sendDay5WhatsApp(row.company_id, row.company_name, row.data_controller_phone, row.grace_period_days);
      } else if (day === 7) {
        sent = await setDay7DashboardAlert(row.company_id);
      }

      if (sent) {
        await recordNotificationSent(row.id, row.company_id, notifType, { daysOverdue: days });
        await logAction({
          companyId: row.company_id,
          action: `subscription_notification_day${day}`,
          entityType: 'subscription',
          entityId: row.id,
          description: `Notificação de inadimplência (dia ${day}) enviada`,
          severity: 'warning'
        }).catch(() => {});
      }
    }
  }
}

module.exports = {
  processProgressiveNotifications,
  daysSinceOverdue,
  NOTIFICATION_DAYS
};
