/**
 * MESSAGING ADAPTER
 * Ponto único de envio de mensagens - usa App Impetus (unifiedMessaging)
 * Substitui zapi.sendTextMessage em todos os fluxos
 */

const unifiedMessaging = require('./unifiedMessagingService');

/**
 * Envia mensagem para destinatário (por userId ou phone)
 * @param {string} companyId - UUID da empresa
 * @param {string} recipientIdentifier - userId (UUID) ou phone (para buscar user)
 * @param {string} message - Texto da mensagem
 * @param {Object} opts - { relatedCommunicationId?, conversationThreadId?, recipientUserId? }
 */
async function sendMessage(companyId, recipientIdentifier, message, opts = {}) {
  const { recipientUserId } = opts;
  const { isValidUUID } = require('../utils/security');

  if (recipientUserId && isValidUUID(recipientUserId)) {
    return unifiedMessaging.sendToUser(companyId, recipientUserId, message, opts);
  }

  const normalized = String(recipientIdentifier || '').replace(/\D/g, '');
  if (normalized.length >= 10) {
    return unifiedMessaging.sendToUserByPhone(companyId, recipientIdentifier, message, opts);
  }

  if (isValidUUID(recipientIdentifier)) {
    return unifiedMessaging.sendToUser(companyId, recipientIdentifier, message, opts);
  }

  return { ok: false, error: 'Destinatário inválido (userId ou phone necessário)' };
}

module.exports = {
  sendMessage
};
