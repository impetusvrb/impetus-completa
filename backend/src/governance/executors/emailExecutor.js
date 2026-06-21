'use strict';

/**
 * EVENT-GOVERNANCE-03 — executor Email.
 * Reutiliza emailService (sendGovernanceNotificationEmail / sendOverdueNotificationEmail).
 */

const EXECUTOR_ID = 'emailExecutor';

async function execute(context) {
  const { companyId, payload = {}, recipients = [], dryRun } = context;

  const to =
    payload.to ||
    payload.email ||
    recipients.find((r) => r.email)?.email;

  const message = String(payload.message || payload.text || payload.body || '').trim();
  const subject = String(payload.subject || payload.title || '[IMPETUS] Notificação').trim();

  if (!to && !dryRun) {
    return { ok: false, executor: EXECUTOR_ID, error: 'email destinatário obrigatório' };
  }

  if (!message && !payload.billingOverdue) {
    return { ok: false, executor: EXECUTOR_ID, error: 'message obrigatório' };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      executor: EXECUTOR_ID,
      channel: 'email',
      preview: {
        companyId,
        toDomain: to ? String(to).split('@')[1] : null,
        subject,
        messageLength: message.length
      }
    };
  }

  const emailService = require('../../services/emailService');

  if (payload.billingOverdue === true) {
    const sent = await emailService.sendOverdueNotificationEmail({
      to,
      companyName: payload.companyName || 'Empresa',
      daysOverdue: payload.daysOverdue || 3,
      gracePeriodDays: payload.gracePeriodDays || 10,
      dueDate: payload.dueDate
    });
    return {
      ok: sent === true,
      executor: EXECUTOR_ID,
      channel: 'email',
      result: { sent }
    };
  }

  const result = await emailService.sendGovernanceNotificationEmail({
    to,
    subject,
    message,
    companyName: payload.companyName || null
  });

  return {
    ok: result.sent === true,
    executor: EXECUTOR_ID,
    channel: 'email',
    result
  };
}

module.exports = {
  EXECUTOR_ID,
  execute
};
