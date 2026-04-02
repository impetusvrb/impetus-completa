const db = require('../db');
const AI_USER_ID = '00000000-0000-0000-0000-000000000001';

async function setUserPresence(userId, isOnline) {
  await db.query(
    `UPDATE users
        SET status_online = $2,
            ultimo_visto = CASE WHEN $2 = false THEN NOW() ELSE ultimo_visto END,
            last_seen = CASE WHEN $2 = false THEN NOW() ELSE last_seen END
      WHERE id = $1`,
    [userId, !!isOnline]
  );
}

async function updateUserProfilePhoto(userId, photoUrl) {
  const { rows } = await db.query(
    `UPDATE users
        SET foto_perfil = $2,
            avatar_url = COALESCE(avatar_url, $2)
      WHERE id = $1
      RETURNING id, name, role, avatar_url, foto_perfil`,
    [userId, photoUrl]
  );
  return rows[0] || null;
}

async function getConversations(userId, companyId) {
  const { rows } = await db.query(`
    SELECT c.id, c.type, c.name, c.avatar_url, c.updated_at,
      (SELECT json_build_object(
        'id', m.id,
        'content', CASE WHEN m.deleted_for_everyone_at IS NOT NULL THEN 'Mensagem apagada' ELSE m.content END,
        'message_type', m.message_type,
        'created_at', m.created_at,
        'sender_id', m.sender_id
       )
       FROM chat_messages m
       WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM chat_message_deleted_for_user dfu WHERE dfu.message_id = m.id AND dfu.user_id = $1)
       ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT json_agg(json_build_object('id',u.id,'name',u.name,'email',u.email,'role',u.role,'avatar_url',COALESCE(u.foto_perfil, u.avatar_url),'status_online',u.status_online,'ultimo_visto',COALESCE(u.ultimo_visto,u.last_seen)))
       FROM chat_participants cp2 JOIN users u ON u.id = cp2.user_id WHERE cp2.conversation_id = c.id AND cp2.user_id != $1 LIMIT 5) AS participants
    FROM chat_conversations c
    JOIN chat_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = $1 AND c.company_id = $2
    ORDER BY c.updated_at DESC
  `, [userId, companyId]);
  return rows;
}

async function getOrCreatePrivateConversation(userId, targetUserId, companyId) {
  const { rows } = await db.query(`
    SELECT c.id FROM chat_conversations c
    JOIN chat_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
    JOIN chat_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
    WHERE c.type = 'private' AND c.company_id = $3 LIMIT 1
  `, [userId, targetUserId, companyId]);
  if (rows.length > 0) return rows[0];
  const { rows: [conv] } = await db.query(
    `INSERT INTO chat_conversations (company_id, type, created_by) VALUES ($1, 'private', $2) RETURNING id`,
    [companyId, userId]
  );
  await db.query(`INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`, [conv.id, userId, targetUserId]);
  return conv;
}

async function createGroup(userId, companyId, name, participantIds) {
  const { rows: [conv] } = await db.query(
    `INSERT INTO chat_conversations (company_id, type, name, created_by) VALUES ($1,'group',$2,$3) RETURNING id`,
    [companyId, name, userId]
  );
  const all = [...new Set([userId, ...participantIds])];
  for (const pid of all) {
    await db.query(`INSERT INTO chat_participants (conversation_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [conv.id, pid, pid === userId ? 'admin' : 'member']);
  }
  return conv;
}

async function getMessages(conversationId, userId, limit = 50, before = null) {
  await verifyParticipant(conversationId, userId);
  let q = `SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content, m.file_url, m.file_name, m.file_size, m.reply_to, m.created_at,
    m.deleted_for_everyone_at,
    json_build_object('id',u.id,'name',u.name,'avatar_url',COALESCE(u.foto_perfil, u.avatar_url),'status_online',u.status_online,'ultimo_visto',COALESCE(u.ultimo_visto,u.last_seen)) AS sender
    FROM chat_messages m LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM chat_message_deleted_for_user dfu WHERE dfu.message_id = m.id AND dfu.user_id = $2)`;
  const params = [conversationId, userId];
  if (before) { params.push(before); q += ` AND m.created_at < $${params.length}`; }
  q += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  const { rows } = await db.query(q, params);
  return rows.reverse();
}

async function deleteMessageForUser(messageId, userId) {
  const { rows } = await db.query(
    `SELECT m.id, m.conversation_id FROM chat_messages m WHERE m.id = $1 AND m.deleted_at IS NULL`,
    [messageId]
  );
  if (!rows.length) throw Object.assign(new Error('Mensagem não encontrada'), { status: 404 });
  const { conversation_id: conversationId } = rows[0];
  await verifyParticipant(conversationId, userId);
  await db.query(
    `INSERT INTO chat_message_deleted_for_user (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [messageId, userId]
  );
  return { conversationId, messageId, scope: 'me' };
}

async function deleteMessageForEveryone(messageId, userId) {
  const { rows } = await db.query(
    `SELECT m.id, m.conversation_id, m.sender_id FROM chat_messages m WHERE m.id = $1 AND m.deleted_at IS NULL`,
    [messageId]
  );
  if (!rows.length) throw Object.assign(new Error('Mensagem não encontrada'), { status: 404 });
  const msg = rows[0];
  if (String(msg.sender_id) !== String(userId)) {
    throw Object.assign(new Error('Só quem enviou pode apagar para todos'), { status: 403 });
  }
  await verifyParticipant(msg.conversation_id, userId);
  const { rowCount } = await db.query(
    `UPDATE chat_messages SET deleted_for_everyone_at = NOW(), content = '', file_url = NULL, file_name = NULL, file_size = NULL
     WHERE id = $1 AND deleted_for_everyone_at IS NULL`,
    [messageId]
  );
  if (!rowCount) throw Object.assign(new Error('Mensagem já apagada ou indisponível'), { status: 400 });
  return { conversationId: msg.conversation_id, messageId, scope: 'everyone' };
}

async function saveMessage({ conversationId, senderId, type, content, fileUrl, fileName, fileSize, replyTo }) {
  const { rows: [msg] } = await db.query(
    `INSERT INTO chat_messages (conversation_id,sender_id,message_type,content,file_url,file_name,file_size,reply_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [conversationId, senderId, type || 'text', content, fileUrl, fileName, fileSize, replyTo]
  );
  await db.query(`UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1`, [conversationId]);
  const { rows: [sender] } = await db.query('SELECT id, name, COALESCE(foto_perfil, avatar_url) AS avatar_url, status_online, COALESCE(ultimo_visto,last_seen) AS ultimo_visto FROM users WHERE id = $1', [senderId]);
  return { ...msg, sender };
}

async function markAsRead(conversationId, userId) {
  await db.query(`UPDATE chat_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`, [conversationId, userId]);
}

async function addReaction(messageId, userId, emoji) {
  await db.query(`INSERT INTO chat_reactions (message_id,user_id,emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [messageId, userId, emoji]);
}

async function removeReaction(messageId, userId, emoji) {
  await db.query(`DELETE FROM chat_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3`, [messageId, userId, emoji]);
}

async function verifyParticipant(conversationId, userId) {
  const { rows } = await db.query(`SELECT 1 FROM chat_participants WHERE conversation_id=$1 AND user_id=$2`, [conversationId, userId]);
  if (rows.length === 0) throw Object.assign(new Error('Acesso negado'), { status: 403 });
}

async function getConversationParticipantIds(conversationId) {
  const { rows } = await db.query(`SELECT user_id FROM chat_participants WHERE conversation_id=$1`, [conversationId]);
  return rows.map(r => r.user_id);
}

async function getConversationParticipants(conversationId, userId) {
  await verifyParticipant(conversationId, userId);
  const { rows } = await db.query(`SELECT u.id,u.name,u.email,u.role,COALESCE(u.foto_perfil,u.avatar_url) AS avatar_url,cp.role AS chat_role FROM chat_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.conversation_id=$1`, [conversationId]);
  return rows;
}

async function addParticipant(conversationId, userId, newUserId) {
  await verifyParticipant(conversationId, userId);
  await db.query(`INSERT INTO chat_participants (conversation_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [conversationId, newUserId]);
}

async function removeParticipant(conversationId, requesterId, targetUserId) {
  await verifyParticipant(conversationId, requesterId);
  await db.query(`DELETE FROM chat_participants WHERE conversation_id=$1 AND user_id=$2`, [conversationId, targetUserId]);
}

async function getCompanyUsers(companyId, excludeUserId) {
  const { rows } = await db.query(`SELECT id,name,email,role,COALESCE(foto_perfil, avatar_url) AS avatar_url,status_online,COALESCE(ultimo_visto,last_seen) AS ultimo_visto FROM users WHERE company_id=$1 AND active=true AND id!=$2 AND role!='ai_system' ORDER BY name`, [companyId, excludeUserId]);
  return rows;
}

async function savePushSubscription(userId, endpoint, p256dh, auth) {
  await db.query(`INSERT INTO chat_push_subscriptions (user_id,endpoint,p256dh,auth) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,endpoint) DO UPDATE SET p256dh=$3,auth=$4`, [userId, endpoint, p256dh, auth]);
}

async function getPushSubscriptions(userIds) {
  const { rows } = await db.query(`SELECT user_id,endpoint,p256dh,auth FROM chat_push_subscriptions WHERE user_id=ANY($1)`, [userIds]);
  return rows;
}

module.exports = { AI_USER_ID, getConversations, getOrCreatePrivateConversation, createGroup, getMessages, saveMessage, markAsRead, addReaction, removeReaction, verifyParticipant, getConversationParticipantIds, getConversationParticipants, addParticipant, removeParticipant, getCompanyUsers, savePushSubscription, getPushSubscriptions, setUserPresence, updateUserProfilePhoto, deleteMessageForUser, deleteMessageForEveryone };
