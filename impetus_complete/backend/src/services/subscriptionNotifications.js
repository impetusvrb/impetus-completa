    await messagingAdapter.sendMessage(companyId, toSend, message);
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
        sent = await sendDay5WhatsApp(row.company_id, row.company_name, row.data_controller_phone);
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
