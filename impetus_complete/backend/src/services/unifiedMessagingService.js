/**
 * UNIFIED MESSAGING SERVICE
 * Substitui zapi.sendTextMessage - envia notificações para usuários do App Impetus
 * Usa Socket.IO para push real-time + grava em app_notifications e communications
 */

const db = require('../db');

let ioInstance = null;

function setSocketIo(io) {
  ioInstance = io;
}

/**
 * Envia mensagem para usuário do app (substitui envio via WhatsApp/Z-API)
 * @param {string} companyId - UUID da empresa
 * @param {string} recipientUserId - UUID do usuário destinatário
 * @param {string} message - Texto da mensagem
 * @param {Object} opts - { relatedCommunicationId?, conversationThreadId?, type? }
 * @returns {Promise<{ ok: boolean, sentViaSocket?: boolean }>}
 */
async function sendToUser(companyId, recipientUserId, message, opts = {}) {
  if (!companyId || !recipientUserId || !message) {
    return { ok: false, error: 'Parâmetros obrigatórios ausentes' };
  }

  try {
    const { relatedCommunicationId, conversationThreadId } = opts;

    const notifResult = await db.query(`
      INSERT INTO app_notifications (
        company_id, recipient_id, communication_id, text_content, message_type
      ) VALUES ($1, $2, $3, $4, 'text')
      RETURNING id
    `, [companyId, recipientUserId, relatedCommunicationId || null, String(message).slice(0, 4000)]);

    await db.query(`
      INSERT INTO communications (
        company_id, source, text_content, direction, conversation_thread_id,
        related_communication_id, status, recipient_id
      ) VALUES ($1, 'app', $2, 'outbound', $3, $4, 'sent', $5)
    `, [companyId, message, conversationThreadId || null, relatedCommunicationId || null, recipientUserId]);

    let sentViaSocket = false;
    if (ioInstance) {
      try {
        ioInstance.to(`user_${recipientUserId}`).emit('app_notification', {
          id: notifResult.rows[0].id,
          text: message,
          related_communication_id: relatedCommunicationId,
          created_at: new Date().toISOString()
        });
        sentViaSocket = true;
        await db.query(
          'UPDATE app_notifications SET sent_via_socket = true WHERE id = $1',
          [notifResult.rows[0].id]
        );
      } catch (e) {
        console.warn('[UNIFIED_MESSAGING] Socket emit:', e.message);
      }
    }

    return { ok: true, sentViaSocket, notificationId: notifResult.rows[0].id };
  } catch (err) {
    console.error('[UNIFIED_MESSAGING] sendToUser:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Envia para usuário identificado por telefone (compatibilidade com fluxo Z-API)
 * Busca user por whatsapp_number ou phone e chama sendToUser
 */
async function sendToUserByPhone(companyId, phone, message, opts = {}) {
  const normalized = String(phone || '').replace(/\D/g, '');
  if (normalized.length < 10) return { ok: false, error: 'Telefone inválido' };

  const r = await db.query(`
    SELECT id FROM users
    WHERE company_id = $1 AND active = true AND deleted_at IS NULL
      AND (
        REPLACE(REPLACE(COALESCE(whatsapp_number,''), ' ', ''), '-', '') LIKE $2
        OR REPLACE(REPLACE(COALESCE(phone,''), ' ', ''), '-', '') LIKE $2
        OR $3 LIKE '%' || RIGHT(REPLACE(REPLACE(COALESCE(whatsapp_number,''), ' ', ''), '-', ''), 11)
      )
    LIMIT 1
  `, [companyId, `%${normalized.slice(-11)}`, normalized]);

  if (r.rows.length === 0) {
    console.warn('[UNIFIED_MESSAGING] Usuário não encontrado para phone:', phone);
    return { ok: false, error: 'Usuário não encontrado no app' };
  }

  return sendToUser(companyId, r.rows[0].id, message, opts);
}

module.exports = {
  setSocketIo,
  sendToUser,
  sendToUserByPhone
};
