'use strict';

/**
 * Formato canónico de mensagem de chat para continuidade operacional (SZ5).
 * Usado por chat consolidado, dashboard chat, triade, injectors.
 */

function formatOperationalChatMessage(raw = {}, opts = {}) {
  const sender = raw.sender || {};
  const senderId = raw.sender_id || sender.id || null;
  const senderName = sender.name || raw.sender_name || 'Utilizador';
  const role = opts.aiUserId && String(senderId) === String(opts.aiUserId) ? 'assistant' : 'user';

  return {
    role,
    sender_id: senderId,
    sender_name: senderName,
    hierarchy_level: raw.hierarchy_level ?? sender.hierarchy_level ?? null,
    department: raw.department ?? sender.department ?? sender.area ?? null,
    operational_role: raw.operational_role ?? sender.role ?? null,
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
    thread_id: raw.conversation_id || raw.thread_id || opts.threadId || null,
    message_id: raw.id || raw.message_id || null,
    content: String(raw.content || raw.text_content || '').trim() || '[arquivo]'
  };
}

function formatForOpenAiMessages(opMsg, opts = {}) {
  const includeMeta = opts.includeMetaInContent !== false;
  const base = opMsg.content;
  const content = includeMeta
    ? `[${opMsg.sender_name}${opMsg.operational_role ? ` · ${opMsg.operational_role}` : ''}]: ${base}`
    : base;
  return { role: opMsg.role, content };
}

function enrichRawMessageFromDb(row = {}, participantMap = {}) {
  const sender = row.sender || {};
  const extra = participantMap[row.sender_id] || {};
  return {
    ...row,
    sender_name: sender.name || extra.name,
    hierarchy_level: extra.hierarchy_level,
    department: extra.department,
    operational_role: extra.role || sender.role
  };
}

module.exports = {
  formatOperationalChatMessage,
  formatForOpenAiMessages,
  enrichRawMessageFromDb
};
