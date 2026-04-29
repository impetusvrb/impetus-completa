/**
 * Integração IA no chat interno (mencionar assistente).
 * Stub mínimo para o servidor subir; substitua pela lógica completa se necessário.
 */
const { detectAIMention } = require('../utils/mentionsAI');

function mentionsAI(content) {
  return detectAIMention(content, { mode: 'lenient' });
}

async function handleAIMessage(_conversationId, _content, _io) {
  /* implementar resposta IA no chat */
}

module.exports = { mentionsAI, handleAIMessage };
