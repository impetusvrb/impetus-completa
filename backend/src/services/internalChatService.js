/**
 * SERVIÇO DE CHAT INTERNO
 * Mensagens entre colaboradores (tipo WhatsApp) - Impetus Comunica IA
 */

const db = require('../db');

/**
 * Busca ou cria conversa 1:1 entre dois usuários da mesma empresa
 */
async function getOrCreateConversation(companyId, userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();

  let result = await db.query(`
    SELECT id, type, participant_ids, last_message_at, created_at
    FROM internal_chat_conversations
    WHERE company_id = $1 
      AND type = 'direct'
      AND array_length(participant_ids, 1) = 2
      AND participant_ids @> ARRAY[$2::uuid, $3::uuid]
    LIMIT 1
  `, [companyId, sortedIds[0], sortedIds[1]]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  result = await db.query(`
    INSERT INTO internal_chat_conversations (company_id, participant_ids, type)
    VALUES ($1, $2, 'direct')
    RETURNING id, type, participant_ids, last_message_at, created_at
  `, [companyId, sortedIds]);

  return result.rows[0];
}

/**
 * Lista colaboradores da empresa (para selecionar no chat)
 */
async function listColaboradores(companyId, excludeUserId = null) {
  let sql = `
    SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.area, u.department,
           d.name as department_name,
           u.last_seen
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.company_id = $1 
      AND u.active = true 
      AND u.deleted_at IS NULL
  `;
  const params = [companyId];
  if (excludeUserId) {
    params.push(excludeUserId);
    sql += ` AND u.id != $${params.length}`;
  }
  sql += ` ORDER BY u.name ASC`;

  const result = await db.query(sql, params);
  return result.rows;
}

/**
 * Lista conversas do usuário (com última mensagem)
 */
async function listConversations(companyId, userId, limit = 30, offset = 0) {
  const result = await db.query(`
    SELECT c.id, c.participant_ids, c.type, c.name, c.last_message_at, c.created_at,
           lm.id as last_message_id, lm.text_content as last_message_preview,
           lm.message_type as last_message_type, lm.created_at as last_message_at,
           lm.sender_id, u.name as sender_name,
           (SELECT COUNT(*) FROM internal_chat_messages m2 
            WHERE m2.conversation_id = c.id AND m2.deleted_at IS NULL 
              AND m2.sender_id != $2
              AND NOT EXISTS (
                SELECT 1 FROM internal_chat_read_receipts rr 
                WHERE rr.message_id = m2.id AND rr.user_id = $2
              )) as unread_count
    FROM internal_chat_conversations c
    LEFT JOIN LATERAL (
      SELECT m.id, m.text_content, m.message_type, m.created_at, m.sender_id
      FROM internal_chat_messages m
      WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC LIMIT 1
    ) lm ON true
    LEFT JOIN users u ON u.id = lm.sender_id
    WHERE c.company_id = $1 AND $2::uuid = ANY(c.participant_ids)
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT $3 OFFSET $4
  `, [companyId, userId, limit, offset]);

  const conversations = result.rows;

  // Enriquecer com dados do outro participante (para chat 1:1)
  for (const conv of conversations) {
    const otherId = (conv.participant_ids || []).find((p) => String(p) !== String(userId));
    if (otherId && conv.type === 'direct') {
      const u = await db.query(
        'SELECT id, name, avatar_url, department FROM users WHERE id = $1',
        [otherId]
      );
      conv.other_user = u.rows[0] || null;
    }
  }

  return conversations;
}

/**
 * Envia mensagem (texto ou mídia)
 */
async function sendMessage({
  companyId,
  conversationId,
  senderId,
  messageType = 'text',
  textContent = null,
  mediaUrl = null,
  mediaFilename = null,
  mediaSizeBytes = null,
  mediaDurationSeconds = null,
  storageProvider = null,
  clientIp = null,
  source = 'app'
}) {
  const result = await db.query(`
    INSERT INTO internal_chat_messages (
      company_id, conversation_id, sender_id, message_type, text_content,
      media_url, media_filename, media_size_bytes, media_duration_seconds,
      storage_provider, client_ip, source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    companyId, conversationId, senderId, messageType, textContent || null,
    mediaUrl, mediaFilename, mediaSizeBytes, mediaDurationSeconds,
    storageProvider, clientIp, source
  ]);

  const msg = result.rows[0];

  await db.query(`
    UPDATE internal_chat_conversations
    SET last_message_at = now(), updated_at = now()
    WHERE id = $1
  `, [conversationId]);

  return msg;
}

/**
 * Lista mensagens de uma conversa (paginação)
 */
async function listMessages(conversationId, userId, limit = 50, beforeId = null) {
  const isParticipant = await db.query(`
    SELECT 1 FROM internal_chat_conversations
    WHERE id = $1 AND $2::uuid = ANY(participant_ids)
  `, [conversationId, userId]);

  if (isParticipant.rows.length === 0) {
    return null;
  }

  let sql = `
    SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
    FROM internal_chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
  `;
  const params = [conversationId];

  if (beforeId) {
    params.push(beforeId);
    sql += ` AND m.created_at < (SELECT created_at FROM internal_chat_messages WHERE id = $${params.length})`;
  }

  params.push(limit);
  sql += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

  const result = await db.query(sql, params);

  // Marcar como lidas
  const msgIds = result.rows.map((r) => r.id).filter(Boolean);
  if (msgIds.length > 0) {
    for (const msgId of msgIds) {
      await db.query(`
        INSERT INTO internal_chat_read_receipts (message_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (message_id, user_id) DO NOTHING
      `, [msgId, userId]);
    }
  }

  return result.rows.reverse();
}

/**
 * Marca mensagens como lidas
 */
async function markAsRead(conversationId, userId) {
  await db.query(`
    INSERT INTO internal_chat_read_receipts (message_id, user_id)
    SELECT m.id, $2
    FROM internal_chat_messages m
    WHERE m.conversation_id = $1 
      AND m.sender_id != $2 
      AND m.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM internal_chat_read_receipts rr 
        WHERE rr.message_id = m.id AND rr.user_id = $2
      )
  `, [conversationId, userId]);

  return { ok: true };
}

module.exports = {
  getOrCreateConversation,
  listColaboradores,
  listConversations,
  sendMessage,
  listMessages,
  markAsRead
};
