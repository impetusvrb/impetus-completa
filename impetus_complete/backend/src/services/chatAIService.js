const OpenAI = require('openai');
const db = require('../db');
const chatService = require('./chatService');
const documentContext = require('./documentContext');
const AI_USER_ID = chatService.AI_USER_ID;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const AI_ORCHESTRATOR_ENABLED = process.env.AI_ORCHESTRATOR_ENABLED === 'true';

async function getConversationContext(conversationId) {
  try {
    const r = await db.query('SELECT company_id FROM chat_conversations WHERE id = $1', [conversationId]);
    return r.rows[0] || {};
  } catch {
    return {};
  }
}

async function handleAIMessage(conversationId, triggerMessage, io) {
  if (!openai) {
    const fallback = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: 'IA não configurada. Configure OPENAI_API_KEY para habilitar respostas automáticas.' });
    if (io) io.to(conversationId).emit('new_message', fallback);
    return fallback;
  }
  try {
    const history = await chatService.getMessages(conversationId, AI_USER_ID, 30);
    const ctx = await getConversationContext(conversationId);
    const companyId = ctx.company_id || null;

    if (AI_ORCHESTRATOR_ENABLED) {
      try {
        const aiOrchestrator = require('./aiOrchestratorService');
        const historyFormatted = history.slice(-12).map((m) => ({
          role: m.sender_id === AI_USER_ID ? 'assistant' : 'user',
          content: (m.sender?.name || 'Usuário') + ': ' + (m.content || '[arquivo]')
        }));
        const reply = await aiOrchestrator.processWithOrchestrator({
          message: triggerMessage,
          history: historyFormatted,
          companyId,
          userName: 'Usuário',
          extraContext: ''
        });
        const txt = (reply || '').startsWith('FALLBACK:') ? 'Resposta temporariamente indisponível. Tente novamente.' : reply;
        const saved = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: txt });
        if (io) io.to(conversationId).emit('new_message', saved);
        return saved;
      } catch (orchErr) {
        console.warn('[CHAT_AI] Orchestrator fallback:', orchErr.message);
      }
    }

    const lgpdProtocol = documentContext.getImpetusLGPDComplianceProtocol();
    const systemContent = [
      'Você é a Impetus IA, assistente do chat interno IMPETUS. Responda em português, de forma concisa e profissional.',
      lgpdProtocol ? `\n\n---\nPROTOCOLO OBRIGATÓRIO - LGPD E ÉTICA DA IA (aplicar em TODAS as respostas):\n${lgpdProtocol}` : ''
    ].filter(Boolean).join('');
    const msgs = [
      { role: 'system', content: systemContent },
      ...history.slice(-20).map(m => ({ role: m.sender_id === AI_USER_ID ? 'assistant' : 'user', content: (m.sender?.name || 'Usuário') + ': ' + (m.content || '[arquivo]') }))
    ];
    const r = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: msgs, max_tokens: 600, temperature: 0.7 });
    const txt = r.choices[0]?.message?.content || 'Não consegui processar.';
    const saved = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: txt });
    if (io) io.to(conversationId).emit('new_message', saved);
    return saved;
  } catch (err) {
    console.error('[CHAT_AI_ERROR]', err.message);
    const e = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: 'Erro ao processar solicitação.' });
    if (io) io.to(conversationId).emit('new_message', e);
    return e;
  }
}
function mentionsAI(c) { return c ? /(@ImpetusIA|@impetus_ia|@ia)/i.test(c) : false; }
module.exports = { handleAIMessage, mentionsAI, AI_USER_ID };
