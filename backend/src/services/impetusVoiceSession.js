/**
 * Memória curta do modo voz Impetus IA (por usuário logado).
 * Máx. 20 mensagens (~10 trocas); reinicia com reset=true no endpoint.
 */
const MAX_MESSAGES = 20;
const sessions = new Map();

function key(userId) {
  return String(userId);
}

function getMessages(userId) {
  const k = key(userId);
  const s = sessions.get(k);
  return s?.messages || [];
}

function append(userId, role, content) {
  const k = key(userId);
  const prev = sessions.get(k)?.messages || [];
  const next = [...prev, { role, content: String(content || '').slice(0, 4000) }];
  while (next.length > MAX_MESSAGES) next.shift();
  sessions.set(k, { messages: next, updatedAt: Date.now() });
}

function clear(userId) {
  sessions.delete(key(userId));
}

/** Para testes / manutenção */
function _stats() {
  return { sessions: sessions.size };
}

module.exports = { getMessages, append, clear, _stats };
