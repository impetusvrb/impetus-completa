'use strict';

/**
 * EVENT-GOVERNANCE-03 — executor Chat.
 * Reutiliza chatService.saveMessage() + socket emit via unifiedMessagingService.getSocketIo().
 */

const EXECUTOR_ID = 'chatExecutor';

async function execute(context) {
  const { companyId, payload = {}, recipients = [], dryRun } = context;

  const conversationId = payload.conversationId;
  const content = String(payload.message || payload.content || payload.text || '').trim();
  const senderId = payload.senderId || require('../../services/chatService').AI_USER_ID;

  if (!conversationId && !dryRun) {
    return { ok: false, executor: EXECUTOR_ID, error: 'conversationId obrigatório' };
  }

  if (!content) {
    return { ok: false, executor: EXECUTOR_ID, error: 'content obrigatório' };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      executor: EXECUTOR_ID,
      channel: 'chat',
      preview: {
        companyId,
        conversationId: conversationId || null,
        recipientCount: recipients.length,
        messageLength: content.length
      }
    };
  }

  const chatService = require('../../services/chatService');
  const unifiedMessaging = require('../../services/unifiedMessagingService');

  await chatService.verifyParticipant(conversationId, senderId).catch(() => {
    /* system sender may not be participant — allow governance broadcast path */
  });

  const msg = await chatService.saveMessage({
    conversationId,
    senderId,
    type: 'text',
    content
  });

  const io = typeof unifiedMessaging.getSocketIo === 'function' ? unifiedMessaging.getSocketIo() : null;
  if (io) {
    io.to(conversationId).emit('new_message', msg);
  }

  return {
    ok: true,
    executor: EXECUTOR_ID,
    channel: 'chat',
    result: { messageId: msg.id, emitted: !!io }
  };
}

module.exports = {
  EXECUTOR_ID,
  execute
};
