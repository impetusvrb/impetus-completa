'use strict';

/**
 * SZ5 — Injector soberano: facts operacionais do chat ANTES do LLM.
 * Integra SZ2/SZ3/SZ4 + retrieval conversacional indexado.
 */

const sz5Flags = require('../runtime-z-sovereign/sz5/config/sz5FeatureFlags');
const sz5Query = require('../runtime-z-sovereign/sz5/query/zOperationalConversationalQueryRuntime');
const sz4Facade = require('../runtime-z-operational-nervous-system/facade/zOperationalNervousSystemFacade');
const cogInjector = require('./zCognitiveContextInjector');

async function buildUnifiedConversationalContext(user, message, opts = {}) {
  const parts = [];
  const meta = {
    sz5_active: false,
    retrieval_hit: false,
    fact_count: 0
  };

  if (!sz5Flags.isEnabled() || !sz5Flags.isFactRetrievalEnabled()) {
    return { block: '', meta };
  }

  meta.sz5_active = true;

  try {
    const q = await sz5Query.queryOperationalConversation(user, message, {
      threadId: opts.conversationId || null,
      limit: sz5Flags.maxFactsInPrompt()
    });

    if (q.scope_denied) {
      return {
        block: `\n[SZ5_GOVERNANCE] Acesso ao contexto conversacional negado: ${q.denial_reason || 'scope'}.`,
        meta
      };
    }

    if (q.answer?.found && q.facts?.length) {
      meta.retrieval_hit = true;
      meta.fact_count = q.facts.length;
      parts.push(
        '--- FACTOS OPERACIONAIS SOBERANOS (Runtime Z SZ5 · chat_messages indexadas) ---',
        'Use APENAS estes factos para responder sobre conversas, reuniões, tarefas e follow-ups. Não diga "não há informações" se houver factos abaixo.',
        `Resposta factual base: ${q.answer.answer_pt}`,
        '',
        'Registos:'
      );
      for (const f of q.facts.slice(0, sz5Flags.maxFactsInPrompt())) {
        parts.push(
          `- [${f.indexed_at}] ${f.actors || '—'} · ${f.workflow_type || 'evento'} · ${f.temporal || ''}: ${f.excerpt}`
        );
      }
      parts.push('--- FIM FACTOS SZ5 ---');
    }
  } catch (err) {
    console.warn('[SZ5_INJECTOR] query:', err?.message ?? err);
  }

  try {
    const sz2sz3 = cogInjector.applyCognitiveEnrichment(user, message, opts.legacyPayload || {});
    if (sz2sz3.block) parts.push(sz2sz3.block);
  } catch (err) {
    console.warn('[SZ5_INJECTOR] sz2/sz3:', err?.message ?? err);
  }

  try {
    const sz4 = sz4Facade.applyOperationalNervousSystem(user, opts.legacyPayload || {}, {
      tenant_id: user?.company_id,
      message
    });
    const p = sz4?.payload?.runtime_z_operational_nervous_system;
    if (p?.tasks?.length || p?.workflows?.length || p?.reminders?.length) {
      parts.push(
        '',
        '--- CONTINUIDADE OPERACIONAL SZ4 ---',
        `Workflows activos: ${p.continuity?.active_workflows ?? 0}; tarefas: ${p.continuity?.active_tasks ?? 0}; lembretes: ${p.continuity?.scheduled_reminders ?? 0}.`,
        '--- FIM SZ4 ---'
      );
    }
  } catch (err) {
    console.warn('[SZ5_INJECTOR] sz4:', err?.message ?? err);
  }

  return {
    block: parts.length ? `\n\n${parts.join('\n')}` : '',
    meta
  };
}

async function indexMessageForSz5(user, message, conversationId, participants = []) {
  if (!sz5Flags.isIndexingEnabled()) return { ok: false, skipped: true };
  try {
    const indexer = require('../runtime-z-sovereign/sz5/indexing/zConversationOperationalIndexerRuntime');
    return await indexer.indexChatMessage({
      tenantId: user?.company_id,
      message: {
        ...message,
        conversation_id: conversationId,
        thread_id: conversationId
      },
      participants
    });
  } catch (err) {
    console.warn('[SZ5_INDEX]', err?.message ?? err);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildUnifiedConversationalContext,
  indexMessageForSz5
};
