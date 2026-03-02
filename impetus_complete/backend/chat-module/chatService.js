/**
 * IMPETUS CHAT MODULE - Serviço principal
 * Multi-tenant, RBAC, auditoria
 */

const db = require('../src/db');

const IMPETUS_IA_NAME = 'Impetus IA';
const IMPETUS_IA_ROLE = 'ai_system';

async function getOrCreatePrivateConversation(companyId, userId1, userId2) {
  const [id1, id2] = [userId1, userId2].sort();

  let conv = await db.query(`
    SELECT c.* FROM chat_conversations c
    JOIN chat_conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $2
    JOIN chat_conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $3
    WHERE c.company_id = $1 AND c.type = 'private'
  `, [companyId, id1, id2]);

  if (conv.rows.length > 0) return conv.rows[0];

  const insert = await db.query(`
    INSERT INTO chat_conversations (company_id, type) VALUES ($1, 'private')
    RETURNING *
  `, [companyId]);
  const newConv = insert.rows[0];

  await db.query(`
    INSERT INTO chat_conversation_participants (conversation_id, user_id)
    VALUES ($1, $2), ($1, $3)
  `, [newConv.id, id1, id2]);

  return newConv;
}

async function createGroup(companyId, creatorId, name, participantIds) {
  const allIds = [...new Set([creatorId, ...participantIds])];
  const conv = await db.query(`
    INSERT INTO chat_conversations (company_id, type, name) VALUES ($1, 'group', $2)
    RETURNING *
  `, [companyId, name || 'Novo Grupo']);
  const c = conv.rows[0];

  for (const uid of allIds) {
    await db.query(`
      INSERT INTO chat_conversation_participants (conversation_id, user_id) VALUES ($1, $2)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `, [c.id, uid]);
  }
  return c;
}

async function listConversations(companyId, userId, limit = 50, offset = 0) {
  const result = await db.query(`
    SELECT c.id, c.type, c.name, c.created_at,
           lm.id as last_message_id, lm.content as last_message_content,
           lm.message_type as last_message_type, lm.created_at as last_message_at,
           lm.sender_id, u.name as sender_name
    FROM chat_conversation_participants p
    JOIN chat_conversations c ON c.id = p.conversation_id AND c.company_id = $1
    LEFT JOIN LATERAL (
      SELECT m.id, m.content, m.message_type, m.created_at, m.sender_id
      FROM chat_messages m WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC LIMIT 1
    ) lm ON true
    LEFT JOIN users u ON u.id = lm.sender_id
    WHERE p.user_id = $2
    ORDER BY lm.created_at DESC NULLS LAST, c.created_at DESC
    LIMIT $3 OFFSET $4
  `, [companyId, userId, limit, offset]);

  const convs = result.rows;
  for (const conv of convs) {
    conv.participants = await getParticipants(conv.id, userId);
    conv.unread_count = await getUnreadCount(conv.id, userId);
  }
  return convs;
}

async function getParticipants(conversationId, excludeUserId = null) {
  let sql = `
    SELECT u.id, u.name, u.avatar_url, u.role, p.joined_at
    FROM chat_conversation_participants p
    JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
    WHERE p.conversation_id = $1
  `;
  const params = [conversationId];
  if (excludeUserId) { params.push(excludeUserId); sql += ` AND p.user_id != $${params.length}`; }
  sql += ' ORDER BY p.joined_at';
  const r = await db.query(sql, params);
  return r.rows;
}

async function getUnreadCount(conversationId, userId) {
  const r = await db.query(`
    SELECT COUNT(*) as n FROM chat_messages m
    WHERE m.conversation_id = $1 AND m.sender_id != $2 AND m.read_at IS NULL
  `, [conversationId, userId]);
  return parseInt(r.rows[0]?.n || 0, 10);
}

async function isParticipant(conversationId, userId) {
  const r = await db.query(`
    SELECT 1 FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, userId]);
  return r.rows.length > 0;
}

async function sendMessage({
  conversationId, senderId, messageType = 'text',
  content = null, fileUrl = null, fileName = null, fileSizeBytes = null, fileDurationSeconds = null,
  clientIp = null, source = 'web'
}) {
  const r = await db.query(`
    INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, file_url, file_name, file_size_bytes, file_duration_seconds, client_ip, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [conversationId, senderId, messageType, content, fileUrl, fileName, fileSizeBytes, fileDurationSeconds, clientIp, source]);

  const msg = r.rows[0];
  await db.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1`, [conversationId]);
  return msg;
}

async function listMessages(conversationId, userId, limit = 50, beforeId = null) {
  const ok = await isParticipant(conversationId, userId);
  if (!ok) return null;

  let sql = `
    SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
  `;
  const params = [conversationId];
  if (beforeId) {
    params.push(beforeId);
    sql += ` AND m.created_at < (SELECT created_at FROM chat_messages WHERE id = $${params.length})`;
  }
  params.push(limit);
  sql += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);

  await db.query(`
    UPDATE chat_messages SET read_at = now()
    WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
  `, [conversationId, userId]);

  return r.rows.reverse();
}

async function getImpetusIAUserId(companyId) {
  const r = await db.query(`
    SELECT id FROM users WHERE company_id = $1 AND role = $2 AND deleted_at IS NULL LIMIT 1
  `, [companyId, IMPETUS_IA_ROLE]);
  return r.rows[0]?.id || null;
}

async function ensureImpetusIAUser(companyId) {
  let id = await getImpetusIAUserId(companyId);
  if (id) return id;

  const insert = await db.query(`
    INSERT INTO users (name, email, role, company_id, active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING id
  `, [`${IMPETUS_IA_NAME}`, `impetus-ia@${companyId}.internal`, IMPETUS_IA_ROLE, companyId]);
  return insert.rows[0].id;
}

async function listColaboradores(companyId, excludeUserId = null) {
  let sql = `
    SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.area, d.name as department_name, u.last_seen
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = $1 AND u.active = true AND u.deleted_at IS NULL AND u.role != $2
  `;
  const params = [companyId, IMPETUS_IA_ROLE];
  if (excludeUserId) { params.push(excludeUserId); sql += ` AND u.id != $${params.length}`; }
  sql += ' ORDER BY u.name';
  const r = await db.query(sql, params);
  return r.rows;
}

module.exports = {
  getOrCreatePrivateConversation,
  createGroup,
  listConversations,
  getParticipants,
  isParticipant,
  sendMessage,
  listMessages,
  getImpetusIAUserId,
  ensureImpetusIAUser,
  listColaboradores,
  IMPETUS_IA_NAME,
  IMPETUS_IA_ROLE
};
