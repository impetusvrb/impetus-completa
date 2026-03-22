/**
 * Integração IA no chat interno (mencionar assistente).
 * Stub mínimo para o servidor subir; substitua pela lógica completa se necessário.
 */
function mentionsAI(content) {
  if (!content || typeof content !== 'string') return false;
  return /@impetus\b|impetus\s*ia|#impetus/i.test(content);
}

async function handleAIMessage(_conversationId, _content, _io) {
  /* implementar resposta IA no chat */
}

module.exports = { mentionsAI, handleAIMessage };
