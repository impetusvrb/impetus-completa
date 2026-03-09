/**
 * IMPETUS CHAT MODULE - Integração com Impetus IA
 * @ImpetusIA - menções, resumir, plano de ação, etc.
 */

const db = require('../src/db');
const aiService = require('../src/services/ai');
const chatService = require('./chatService');

const ACTIONS = {
  resumir: 'Resuma a conversa em até 5 bullet points.',
  plano_acao: 'Gere um plano de ação com tarefas concretas baseado na conversa. Formato: 1) Tarefa - Responsável sugerido - Prazo',
  conflitos: 'Identifique possíveis conflitos ou divergências na conversa.',
  atrasos: 'Detecte menções a atrasos, prazos perdidos ou urgências.',
  relatorio: 'Gere um relatório interno resumindo os principais pontos da conversa.'
};

async function getConversationHistory(conversationId, limit = 50) {
  const r = await db.query(`
    SELECT m.content, m.message_type, m.file_url, m.created_at, u.name as sender_name, u.role as sender_role
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2
  `, [conversationId, limit]);
  return r.rows.map((row) => {
    const text = row.message_type === 'text' ? row.content : `[${row.message_type}] ${row.content || row.file_url || ''}`;
    return `${row.sender_name || 'Sistema'}: ${text}`;
  }).join('\n');
}

async function logAIChat(companyId, conversationId, userId, prompt, response, action) {
  try {
    await db.query(`
      INSERT INTO ai_audit_logs (company_id, user_id, action, question, response_preview, response_length)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      companyId,
      userId,
      `chat_internal_${action}`,
      (prompt || '').slice(0, 2000),
      (response || '').slice(0, 500),
      (response || '').length
    ]);
  } catch (err) {
    console.warn('[CHAT_AI_LOG]', err.message);
  }
}

async function invokeAI({ companyId, conversationId, requestedBy, action, context }) {
  const history = await getConversationHistory(conversationId);
  const actionPrompt = ACTIONS[action] || ACTIONS.resumir;

  const prompt = `Você é a Impetus IA, assistente do sistema de comunicação interna industrial.

Conversa:
---
${history}
---

${actionPrompt}

Responda de forma direta e profissional. Use markdown se apropriado.`;

  const response = await aiService.chatCompletion(prompt, { max_tokens: 600 });

  const aiUserId = await chatService.ensureImpetusIAUser(companyId);
  const msg = await chatService.sendMessage({
    conversationId,
    senderId: aiUserId,
    messageType: 'ai',
    content: response,
    source: 'ai'
  });

  await logAIChat(companyId, conversationId, requestedBy, prompt, response, action);
  return msg;
}

function detectMention(text) {
  return /\@[Ii]mpetus[Ii]A?\b/.test(text || '');
}

async function processIncomingForAI(conversationId, companyId, textContent) {
  if (!textContent || !detectMention(textContent)) return null;

  let action = 'resumir';
  const t = (textContent || '').toLowerCase();
  if (/plano|ação|acao/.test(t)) action = 'plano_acao';
  else if (/conflito|divergência/.test(t)) action = 'conflitos';
  else if (/atraso|prazo|urgente/.test(t)) action = 'atrasos';
  else if (/relatório|relatorio/.test(t)) action = 'relatorio';

  return invokeAI({
    companyId,
    conversationId,
    requestedBy: null,
    action,
    context: { triggered_by_mention: true }
  });
}

module.exports = {
  invokeAI,
  detectMention,
  processIncomingForAI,
  getConversationHistory,
  logAIChat
};
