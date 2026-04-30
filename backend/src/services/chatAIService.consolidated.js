/**
 * CONSOLIDAÇÃO chatAIService
 *
 * Funções encontradas no oficial (backend/src/services/chatAIService.js):
 * - mentionsAI(content)
 * - handleAIMessage(_conversationId, _content, _io) — corpo vazio (stub)
 *
 * Funções encontradas no legado (impetus_complete/.../chatAIService.js):
 * - sanitizeContent(v)
 * - buildLiveChatSystemPrompt(lgpdProtocol)
 * - getConversationContext(conversationId)
 * - handleAIMessage(conversationId, triggerMessage, io)
 * - mentionsAI(c)
 * (+ constantes runtime: openai, env AI_ORCHESTRATOR_ENABLED, LIVE_CHAT_MODEL)
 * (+ export: AI_USER_ID re-exportado de chatService)
 *
 * Diferenças principais:
 * - Menções: backend/src/utils/mentionsAI.js (detectAIMention); stub oficial não processa IA.
 * - Tríade contextualizada (CHAT_USE_TRIADE=true): conversa + participante humano,
 *   retrieveContextualData (operational_overview) quando disponível, runCognitiveCouncil com data/context.
 * - Legado consolidado: documentContext, histórico (chatService), opcional ./aiOrchestratorService quando
 *   AI_ORCHESTRATOR_ENABLED=true.
 * - [CONTRACT_FIX] triggerMessage normalizado para string (objeto com .content ou JSON).
 * - [ORCHESTRATOR_SAFE_FALLBACK] require resolvido com try/catch + ramos processWithOrchestrator / process.
 *
 * Decisão de consolidação:
 * - handleAIMessage: substituir stub pela implementação legada (marcado STUB_REPLACED_WITH_LEGACY).
 * - mentionsAI: delega à util central detectAIMention (fonte única).
 * - Funções auxiliares só no legado: incluídas com [LEGACY_IMPORT].
 * - Exports: handleAIMessage, mentionsAI, AI_USER_ID (compatível com legado e superset do oficial).
 */

const OpenAI = require('openai');
const db = require('../db');
const chatService = require('./chatService');
const documentContext = require('./documentContext');
const { detectAIMention } = require('../utils/mentionsAI');

const AI_USER_ID = chatService.AI_USER_ID;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const AI_ORCHESTRATOR_ENABLED = process.env.AI_ORCHESTRATOR_ENABLED === 'true';
const LIVE_CHAT_MODEL = process.env.IMPETUS_LIVE_CHAT_MODEL || 'gpt-4o';

let cognitiveOrchestrator = null;
try {
  cognitiveOrchestrator = require('../ai/cognitiveOrchestrator');
} catch (e) {
  console.warn('[TRIADE_ORCHESTRATOR_NOT_AVAILABLE]', e?.message ?? e);
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

// [LEGACY_IMPORT] função trazida do legado
function sanitizeContent(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

// [LEGACY_IMPORT] função trazida do legado
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

// [LEGACY_IMPORT] função trazida do legado
async function getConversationContext(conversationId) {
  try {
    const r = await db.query('SELECT company_id FROM chat_conversations WHERE id = $1', [conversationId]);
    return r.rows[0] || {};
  } catch {
    return {};
  }
}

/** Metadados da conversa para tríade (equivalente a getConversation). */
async function loadConversationRow(conversationId) {
  try {
    const r = await db.query(
      'SELECT id, company_id FROM chat_conversations WHERE id = $1 LIMIT 1',
      [conversationId]
    );
    return r.rows[0] || null;
  } catch (_e) {
    return null;
  }
}

/** Participantes com user_id (equivalente a listar para find humano). */
async function loadParticipantRows(conversationId) {
  try {
    const r = await db.query(
      `SELECT u.id AS user_id, u.role, u.company_id
       FROM chat_participants cp
       INNER JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );
    return r.rows || [];
  } catch (_e) {
    return [];
  }
}

/**
 * // [STUB_REPLACED_WITH_LEGACY] — substitui corpo vazio do oficial pela lógica legada.
 * // [REVIEW_REQUIRED] Parâmetro da versão oficial era _content; aqui alinhado ao legado (triggerMessage).
 */
async function handleAIMessage(conversationId, triggerMessage, io) {
  // [CONTRACT_FIX] Normalização de entrada para evitar inconsistência string vs objeto
  const normalizedMessage = normalizeTriggerMessage(triggerMessage);

  if (
    process.env.CHAT_USE_TRIADE === 'true' &&
    cognitiveOrchestrator &&
    typeof cognitiveOrchestrator.runCognitiveCouncil === 'function'
  ) {
    try {
      const conversation = await loadConversationRow(conversationId);
      const participants = await loadParticipantRows(conversationId);
      const userRow = participants.find((p) => String(p.user_id) !== String(AI_USER_ID));
      const ctxEarly = await getConversationContext(conversationId);
      const companyIdResolved =
        conversation?.company_id || ctxEarly.company_id || userRow?.company_id || null;

      const userContext = {
        id: userRow?.user_id ?? null,
        company_id: companyIdResolved,
        role: userRow?.role ?? null
      };

      let impetusUnifiedDecision = null;
      if (process.env.UNIFIED_DECISION_ENGINE === 'true') {
        try {
          const unifiedDecisionEngine = require('./unifiedDecisionEngine');
          impetusUnifiedDecision = await unifiedDecisionEngine.decide({
            user: userContext,
            context: {
              message: normalizedMessage,
              conversationId,
              company_id: companyIdResolved
            },
            options: null,
            source: 'chat_triade',
            skipCognitiveInvocation: true
          });
        } catch (uErr) {
          console.warn('[UNIFIED_DECISION_CHAT_TRIADE]', uErr?.message || String(uErr));
        }
      }

      let retrieveContextualData = null;
      try {
        retrieveContextualData =
          require('../services/dataRetrievalService').retrieveContextualData;
      } catch (_e) {
        /* sem dataRetrieval — tríade com dados mínimos */
      }

      let contextualData = null;
      if (typeof retrieveContextualData === 'function' && userContext.company_id) {
        try {
          contextualData = await retrieveContextualData({
            user: userContext,
            intent: 'operational_overview',
            entities: {}
          });
        } catch (dataErr) {
          console.warn('[TRIADE_DATA_RETRIEVAL]', dataErr?.message || String(dataErr));
          contextualData = null;
        }
      }

      const triadeData = {
        contextual_data: contextualData?.contextual_data || {},
        kpis: Array.isArray(contextualData?.kpis) ? contextualData.kpis : [],
        events: Array.isArray(contextualData?.events) ? contextualData.events : [],
        assets: Array.isArray(contextualData?.assets) ? contextualData.assets : []
      };

      const dossier = {
        data: triadeData,
        context: {
          source: 'chat',
          conversationId
        }
      };

      const hasData =
        !!(
          triadeData.contextual_data &&
          typeof triadeData.contextual_data === 'object' &&
          Object.keys(triadeData.contextual_data).length > 0
        ) ||
        triadeData.kpis.length > 0 ||
        triadeData.events.length > 0 ||
        triadeData.assets.length > 0;

      console.info('[TRIADE_CONTEXTUALIZED]', {
        hasUser: !!userContext.id,
        hasCompany: !!userContext.company_id,
        hasData
      });

      const councilOptions =
        impetusUnifiedDecision && impetusUnifiedDecision.ok !== false && impetusUnifiedDecision.skipped !== true
          ? { impetusUnifiedDecision }
          : {};

      const councilOut = await cognitiveOrchestrator.runCognitiveCouncil({
        user: userContext,
        requestText: normalizedMessage,
        input: { text: normalizedMessage },
        data: dossier.data,
        context: {
          ...dossier.context,
          conversation_id: String(conversationId),
          message: normalizedMessage
        },
        module: 'chat_interno',
        options: councilOptions
      });

      const result = councilOut && councilOut.result ? councilOut.result : null;
      let raw = '';
      if (councilOut && councilOut.ok && result) {
        if (typeof result.answer === 'string' && result.answer.length > 0) {
          raw = result.answer.trim();
        } else if (typeof result.content === 'string' && result.content.length > 0) {
          raw = result.content.trim();
        }
      }
      if (raw.startsWith('FALLBACK:')) {
        raw = '';
      }
      if (raw.length > 0) {
        console.info('[TRIADE_CHAT_ACTIVE]');
        const saved = await chatService.saveMessage({
          conversationId,
          senderId: AI_USER_ID,
          type: 'ai',
          content: raw
        });
        if (io) io.to(conversationId).emit('new_message', saved);
        return saved;
      }
    } catch (triErr) {
      console.warn('[TRIADE_CHAT_FALLBACK]', triErr?.message || String(triErr));
    }
  }

  if (!openai) {
    try {
      const fallback = await chatService.saveMessage({
        conversationId,
        senderId: AI_USER_ID,
        type: 'ai',
        content: 'IA não configurada. Configure OPENAI_API_KEY para habilitar respostas automáticas.'
      });
      if (io) io.to(conversationId).emit('new_message', fallback);
      return fallback;
    } catch (e) {
      console.error('[CHAT_AI_ERROR] saveMessage (no openai)', e?.message ?? e);
      return { ok: false, message: 'Falha ao processar mensagem de IA' };
    }
  }

  try {
    const history = await chatService.getMessages(conversationId, AI_USER_ID, 30);
    const ctx = await getConversationContext(conversationId);
    const companyId = ctx.company_id || null;

    if (AI_ORCHESTRATOR_ENABLED) {
      let orchestrator = null;
      try {
        orchestrator = require('./aiOrchestratorService');
      } catch (_err) {
        try {
          orchestrator = require('../ai/aiOrchestrator');
        } catch (_err2) {
          console.warn('[ORCHESTRATOR_FALLBACK]', 'Nenhum orquestrador disponível');
        }
      }

      const historyFormatted = history.slice(-12).map((m) => ({
        role: m.sender_id === AI_USER_ID ? 'assistant' : 'user',
        content: (m.sender?.name || 'Usuário') + ': ' + (m.content || '[arquivo]')
      }));

      // [ORCHESTRATOR_SAFE_FALLBACK] compatibilidade entre legado e nova arquitetura
      if (orchestrator && typeof orchestrator.processWithOrchestrator === 'function') {
        try {
          const reply = await orchestrator.processWithOrchestrator({
            message: normalizedMessage,
            history: historyFormatted,
            companyId,
            userName: 'Usuário',
            extraContext: ''
          });
          const txt = (reply || '').startsWith('FALLBACK:')
            ? 'Resposta temporariamente indisponível. Tente novamente.'
            : reply;
          const saved = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: txt });
          if (io) io.to(conversationId).emit('new_message', saved);
          return saved;
        } catch (orchErr) {
          console.warn('[CHAT_AI] Orchestrator fallback:', orchErr.message);
        }
      } else if (orchestrator && typeof orchestrator.process === 'function') {
        try {
          const out = await orchestrator.process({
            message: normalizedMessage,
            history: historyFormatted,
            companyId,
            userName: 'Usuário',
            extraContext: ''
          });
          const reply =
            typeof out === 'string'
              ? out
              : out != null && typeof out === 'object' && typeof out.response === 'string'
                ? out.response
                : '';
          if (!reply) {
            // [REVIEW_REQUIRED] Contrato de process() pode não ser { response }; não assumir mais compostos.
            throw new Error('process() retorno vazio ou formato inesperado');
          }
          const txt = reply.startsWith('FALLBACK:')
            ? 'Resposta temporariamente indisponível. Tente novamente.'
            : reply;
          const saved = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: txt });
          if (io) io.to(conversationId).emit('new_message', saved);
          return saved;
        } catch (orchErr) {
          console.warn('[CHAT_AI] Orchestrator process() fallback:', orchErr.message);
        }
      }
    }

    const lgpdProtocol = documentContext.getImpetusLGPDComplianceProtocol();
    const systemContent = buildLiveChatSystemPrompt(lgpdProtocol);

    if (process.env.UNIFIED_DECISION_ENGINE === 'true') {
      try {
        const unifiedDecisionEngine = require('./unifiedDecisionEngine');
        const participantsShadow = await loadParticipantRows(conversationId);
        const userRowShadow = participantsShadow.find((p) => String(p.user_id) !== String(AI_USER_ID));
        const userShadow = {
          id: userRowShadow?.user_id ?? null,
          company_id: companyId,
          role: userRowShadow?.role ?? null
        };
        const unified = await unifiedDecisionEngine.decide({
          user: userShadow,
          context: { message: normalizedMessage, conversationId, company_id: companyId },
          source: 'chat_consolidated',
          skipCognitiveInvocation: true
        });
        if (unified?.decision) {
          console.warn('[UNIFIED_DECISION_USED]', { source: 'chat_consolidated' });
        }
      } catch (err) {
        console.warn('[UNIFIED_DECISION_FAIL]', err?.message || String(err));
      }
    }

    const msgs = [
      { role: 'system', content: systemContent },
      ...history.slice(-20).map((m) => ({
        role: m.sender_id === AI_USER_ID ? 'assistant' : 'user',
        content: sanitizeContent(m.content || '[arquivo]')
      })),
      { role: 'user', content: sanitizeContent(normalizedMessage) }
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
    try {
      const e = await chatService.saveMessage({
        conversationId,
        senderId: AI_USER_ID,
        type: 'ai',
        content: 'Erro ao processar solicitação.'
      });
      if (io) io.to(conversationId).emit('new_message', e);
      return e;
    } catch (saveErr) {
      console.error('[CHAT_AI_ERROR] saveMessage fallback failed', saveErr?.message ?? saveErr);
      return { ok: false, message: 'Falha ao processar mensagem de IA' };
    }
  }
}

/**
 * Detecção de menção à IA — delegada à util central (mesmo contrato que o legado).
 */
function mentionsAI(content) {
  return detectAIMention(content, { mode: 'lenient' });
}

module.exports = { handleAIMessage, mentionsAI, AI_USER_ID };
