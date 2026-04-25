const OpenAI = require('openai');
const db = require('../db');
const chatService = require('./chatService');
const documentContext = require('./documentContext');
const AI_USER_ID = chatService.AI_USER_ID;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const AI_ORCHESTRATOR_ENABLED = process.env.AI_ORCHESTRATOR_ENABLED === 'true';
const LIVE_CHAT_MODEL = process.env.IMPETUS_LIVE_CHAT_MODEL || 'gpt-4o';

function sanitizeContent(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function buildLiveChatSystemPrompt(lgpdProtocol) {
  return [
    'Você é a Impetus IA do chat interno da empresa.',
    'Objetivo: conversar com naturalidade, manter coerência com o contexto e ser útil no próximo passo.',
    'Idioma: português do Brasil.',
    'Estilo: humano, claro, direto e respeitoso; evite jargão desnecessário.',
    'Regras de qualidade:',
    '- Responda ao ponto principal primeiro e depois detalhe somente se necessário.',
    '- Não invente fatos. Se faltar contexto, diga o que falta e faça 1 pergunta objetiva.',
    '- Evite respostas genéricas, repetitivas ou fora de contexto.',
    '- Sempre que útil, entregue em formato: diagnóstico curto + ação recomendada + próximo passo.',
    '- Não use tom robótico nem frases de abertura repetidas.',
    lgpdProtocol
      ? `\nPROTOCOLO OBRIGATÓRIO - LGPD E ÉTICA DA IA (aplicar em TODAS as respostas):\n${lgpdProtocol}`
      : ''
  ].join('\n');
}

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
    const systemContent = buildLiveChatSystemPrompt(lgpdProtocol);
    const msgs = [
      { role: 'system', content: systemContent },
      ...history.slice(-20).map((m) => ({
        role: m.sender_id === AI_USER_ID ? 'assistant' : 'user',
        content: sanitizeContent(m.content || '[arquivo]')
      })),
      { role: 'user', content: sanitizeContent(triggerMessage) }
    ];
    const r = await openai.chat.completions.create({
      model: LIVE_CHAT_MODEL,
      messages: msgs,
      max_tokens: 700,
      temperature: 0.45,
      top_p: 0.9,
      presence_penalty: 0.2
    });
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
