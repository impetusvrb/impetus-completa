/**
 * Integração IA no chat interno (mencionar assistente).
 *
 * mentionsAI: deteção central (mentionsAI util).
 * handleAIMessage: resposta mínima funcional quando o fluxo consolidado não está ativo
 * (sem flags novas). Usa secureContextBuilder + orchestrator central.
 */
const db = require('../db');
const chatService = require('./chatService');
const documentContext = require('./documentContext');
const { detectAIMention } = require('../utils/mentionsAI');
const secureContextBuilder = require('./secureContextBuilder');
const { runAI } = require('../ai/orchestrator');

const AI_USER_ID = chatService.AI_USER_ID;

function mentionsAI(content) {
  return detectAIMention(content, { mode: 'lenient' });
}

function normalizeTriggerMessage(input) {
  if (!input) return '';

  if (typeof input === 'string') return input;

  if (typeof input === 'object') {
    if (typeof input.content === 'string') return input.content;

    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }

  return String(input);
}

function sanitizeVisibleReply(raw) {
  const t = (raw || '').trim();
  if (!t) {
    return 'Não foi possível gerar uma resposta agora. Tente novamente em instantes.';
  }
  if (t.startsWith('FALLBACK:')) {
    return 'Resposta temporariamente indisponível. Tente novamente.';
  }
  return t;
}

async function loadConversationRow(conversationId) {
  try {
    const r = await db.query(
      'SELECT id, company_id FROM chat_conversations WHERE id = $1 LIMIT 1',
      [conversationId]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

/** Equivalente ao carregamento de participantes do consolidado: primeiro humano ≠ IA. */
async function loadHumanParticipantContext(conversationId) {
  try {
    const r = await db.query(
      `SELECT u.id AS user_id, u.role, u.company_id, u.name, u.email
       FROM chat_participants cp
       INNER JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );
    const rows = r.rows || [];
    const human = rows.find((p) => String(p.user_id) !== String(AI_USER_ID));
    if (!human) return null;
    return {
      id: human.user_id,
      company_id: human.company_id,
      role: human.role,
      name: human.name,
      email: human.email
    };
  } catch {
    return null;
  }
}

/**
 * Resposta IA no chat interno (legado). Contrato: igual ao consolidado — devolver mensagem
 * gravada (com sender) ou objeto de erro compatível com o loader.
 */
async function handleAIMessage(conversationId, content, io) {
  const normalizedMessage = normalizeTriggerMessage(content);

  if (!normalizedMessage || typeof normalizedMessage !== 'string') {
    console.warn('[CHAT_LEGACY_FALLBACK]', {
      reason: 'invalid_message',
      userId: null,
      conversationId: conversationId != null ? String(conversationId) : null
    });
    try {
      const fallback = await chatService.saveMessage({
        conversationId,
        senderId: AI_USER_ID,
        type: 'ai',
        content: 'Mensagem inválida ou vazia. Escreva um texto para eu poder ajudar.'
      });
      if (io) io.to(conversationId).emit('new_message', fallback);
      return fallback;
    } catch (e) {
      console.error('[CHAT_LEGACY_FALLBACK] saveMessage invalid_message', e?.message ?? e);
      return { ok: false, message: 'Falha ao processar mensagem de IA' };
    }
  }

  const conversation = await loadConversationRow(conversationId);
  const humanUser = await loadHumanParticipantContext(conversationId);
  const companyId =
    conversation?.company_id || humanUser?.company_id || null;

  const userContext = humanUser || {
    id: null,
    company_id: companyId,
    role: null
  };

  console.warn('[CHAT_LEGACY_FALLBACK]', {
    reason: 'stub_detected',
    userId: userContext.id,
    conversationId: conversationId != null ? String(conversationId) : null
  });

  let governanceBlock = '';
  try {
    const secureCtx = await secureContextBuilder.buildContext(userContext, {
      companyId,
      queryText: normalizedMessage.slice(0, 4000)
    });
    if (secureCtx && typeof secureCtx.context === 'string' && secureCtx.context.trim()) {
      governanceBlock = secureCtx.context.trim();
    }
  } catch (e) {
    console.warn('[CHAT_LEGACY_FALLBACK][secureContextBuilder]', e?.message ?? e);
  }

  const lgpd = documentContext.getImpetusLGPDComplianceProtocol();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  let rawReply = '';
  try {
    rawReply = await runAI({
      input: normalizedMessage.slice(0, 12000),
      user: {
        id: userContext.id || null,
        company_id: userContext.company_id || companyId || null
      },
      context: {
        complianceBlock: lgpd ? `Protocolo LGPD e ética:\n${lgpd}` : '',
        governanceBlock
      },
      mode: 'assistant',
      maxTokens: 700,
      model
    });
  } catch (e) {
    console.warn('[CHAT_LEGACY_FALLBACK][chatCompletionMessages]', e?.message ?? e);
    rawReply = '';
  }

  const visible = sanitizeVisibleReply(rawReply);

  try {
    const saved = await chatService.saveMessage({
      conversationId,
      senderId: AI_USER_ID,
      type: 'ai',
      content: visible
    });
    if (io) io.to(conversationId).emit('new_message', saved);
    return saved;
  } catch (e) {
    console.error('[CHAT_LEGACY_ERROR] saveMessage', e?.message ?? e);
    return { ok: false, message: 'Falha ao processar mensagem de IA' };
  }
}

module.exports = { mentionsAI, handleAIMessage };
