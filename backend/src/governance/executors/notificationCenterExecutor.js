'use strict';

/**
 * EVENT-GOVERNANCE-03 — executor Notification Center.
 * Reutiliza unifiedMessagingService.sendToUser().
 */

const EXECUTOR_ID = 'notificationCenterExecutor';

async function execute(context) {
  const { companyId, payload = {}, recipients = [], dryRun } = context;

  if (!companyId) {
    return { ok: false, executor: EXECUTOR_ID, error: 'companyId obrigatório' };
  }

  const userId =
    payload.userId ||
    payload.recipientUserId ||
    recipients.find((r) => r.userId)?.userId ||
    (recipients[0]?.userIds && recipients[0].userIds[0]);

  const message = String(payload.message || payload.text || payload.title || '').trim();
  if (!message) {
    return { ok: false, executor: EXECUTOR_ID, error: 'message obrigatório' };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      executor: EXECUTOR_ID,
      channel: 'notification_center',
      preview: { companyId, userId, messageLength: message.length }
    };
  }

  if (!userId) {
    return { ok: false, executor: EXECUTOR_ID, error: 'recipientUserId obrigatório' };
  }

  const unifiedMessaging = require('../../services/unifiedMessagingService');
  const result = await unifiedMessaging.sendToUser(companyId, userId, message, {
    type: payload.type || 'event_governance',
    relatedCommunicationId: payload.relatedCommunicationId || null,
    conversationThreadId: payload.conversationThreadId || null
  });

  return {
    ok: result.ok === true,
    executor: EXECUTOR_ID,
    channel: 'notification_center',
    result
  };
}

module.exports = {
  EXECUTOR_ID,
  execute
};
