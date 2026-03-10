/**
 * CLAUDE ANALYTICS - Pipeline de ingestão e interpretação
 * Recebe dados brutos do sistema, envia a Claude para extrair fatos,
 * persiste na memória operacional E na memória corporativa (knowledge_memory, casos, eventos).
 * Execução assíncrona (não bloqueia).
 */
const claudeService = require('./claudeService');
const operationalMemory = require('./operationalMemoryService');
const corporateMemory = require('./corporateMemoryService');

const OPERATIONAL_MEMORY_ENABLED = process.env.OPERATIONAL_MEMORY_ENABLED !== 'false';
const CORPORATE_MEMORY_ENABLED = process.env.CORPORATE_MEMORY_ENABLED !== 'false';

/** Throttle por empresa: última ingestão por companyId */
const lastIngestByCompany = new Map();
const INGEST_MIN_INTERVAL_MS = 2000;

const SOURCE_TYPES = {
  CHAT_IMPETUS: 'chat_impetus',
  INTERNAL_CHAT: 'internal_chat',
  REGISTRO_INTELIGENTE: 'registro_inteligente',
  PROACAO: 'proacao',
  ORDEM_SERVICO: 'os',
  EVENTO: 'evento'
};

/**
 * Processa conteúdo e grava fatos na memória (fire-and-forget)
 * Não bloqueia o fluxo principal. Falhas são logadas.
 * Rate limit: máx 1 ingestão por empresa a cada 2s.
 */
function ingestAsync(rawContent, opts = {}) {
  const {
    companyId,
    sourceType = SOURCE_TYPES.EVENTO,
    sourceId = null,
    sourceMetadata = {},
    scopeHints = {}
  } = opts;

  if (!OPERATIONAL_MEMORY_ENABLED || !companyId || !rawContent) return;

  setImmediate(() => {
    const run = async () => {
      const now = Date.now();
      const last = lastIngestByCompany.get(companyId) || 0;
      if (now - last < INGEST_MIN_INTERVAL_MS) return;
      lastIngestByCompany.set(companyId, now);

      try {
        const extracted = await claudeService.extractOperationalFacts(rawContent, {
          sourceType,
          scopeHints
        });
        if (!extracted) return;

        const hasFacts = extracted.facts?.length > 0;
        const hasCorporateEvents = extracted.corporate_events?.length > 0;

        if (OPERATIONAL_MEMORY_ENABLED && hasFacts) {
          const { inserted } = await operationalMemory.storeFacts({
            companyId,
            facts: extracted.facts,
            sourceType,
            sourceId,
            sourceMetadata: { summary: extracted.summary, ...sourceMetadata }
          });
          if (inserted > 0) {
            console.info('[CLAUDE_ANALYTICS] Ingested', inserted, 'facts from', sourceType);
          }
        }

        if (CORPORATE_MEMORY_ENABLED && hasCorporateEvents) {
          const r = await corporateMemory.persistCorporateEvents({
            companyId,
            corporateEvents: extracted.corporate_events,
            sourceType,
            sourceId,
            sourceMetadata: { summary: extracted.summary, ...sourceMetadata },
            conversationId: sourceMetadata.conversationId || sourceId
          });
          const total = r.kmInserted + r.tasksCreated;
          if (total > 0) {
            console.info('[CLAUDE_ANALYTICS] Corporate memory:', r.kmInserted, 'events,', r.tasksCreated, 'tasks from', sourceType);
          }
        }
      } catch (err) {
        console.warn('[CLAUDE_ANALYTICS] ingest error:', err.message);
      }
    };
    run().catch((err) => console.warn('[CLAUDE_ANALYTICS] unhandled:', err.message));
  });
}

/**
 * Ingestão: conversa do Chat Impetus (dashboard)
 */
function ingestChatImpetus(message, history = [], companyId, userId) {
  const lines = (history || []).slice(-4).map((m) => {
    const role = m.role === 'user' ? 'Usuário' : 'IA';
    return `${role}: ${(m.content || '').slice(0, 400)}`;
  });
  lines.push(`Usuário: ${(message || '').slice(0, 1000)}`);
  const rawContent = lines.join('\n');
  ingestAsync(rawContent, {
    companyId,
    sourceType: SOURCE_TYPES.CHAT_IMPETUS,
    sourceId: userId,
    sourceMetadata: { type: 'interaction' }
  });
}

/**
 * Ingestão: mensagens do Chat Interno
 */
function ingestInternalChat(messages, companyId, conversationId) {
  const rawContent = messages
    .map((m) => `${m.sender_name || 'Usuário'}: ${(m.text_content || m.content || '').slice(0, 500)}`)
    .join('\n');
  if (!rawContent.trim()) return;
  ingestAsync(rawContent, {
    companyId,
    sourceType: SOURCE_TYPES.INTERNAL_CHAT,
    sourceId: conversationId,
    sourceMetadata: { conversationId }
  });
}

/**
 * Ingestão: Registro Inteligente
 */
function ingestRegistroInteligente(registration, companyId) {
  const parts = [];
  if (registration.ai_summary) parts.push(registration.ai_summary);
  if (registration.original_text) parts.push(registration.original_text);
  if (registration.main_category) parts.push(`Categoria: ${registration.main_category}`);
  if (registration.problems_detected?.length) parts.push(`Problemas: ${registration.problems_detected.join(', ')}`);
  if (registration.pendencies_detected?.length) parts.push(`Pendências: ${registration.pendencies_detected.join(', ')}`);
  if (registration.machine_identified) parts.push(`Máquina: ${registration.machine_identified}`);
  if (registration.line_identified) parts.push(`Linha: ${registration.line_identified}`);
  const rawContent = parts.join('\n');
  if (!rawContent.trim()) return;
  ingestAsync(rawContent, {
    companyId,
    sourceType: SOURCE_TYPES.REGISTRO_INTELIGENTE,
    sourceId: registration.id,
    sourceMetadata: registration,
    scopeHints: {
      machine: registration.machine_identified,
      line: registration.line_identified,
      sector: registration.sector_identified
    }
  });
}

/**
 * Ingestão: Pró-Ação (ações, pendências)
 */
function ingestProacao(action, companyId) {
  const parts = [
    action.title || '',
    action.description || '',
    action.status || '',
    action.cause || ''
  ].filter(Boolean);
  const rawContent = parts.join('\n');
  if (!rawContent.trim()) return;
  ingestAsync(rawContent, {
    companyId,
    sourceType: SOURCE_TYPES.PROACAO,
    sourceId: action.id
  });
}

/**
 * Ingestão: Ordem de Serviço
 */
function ingestOrdemServico(os, companyId) {
  const parts = [
    os.failure_description || '',
    os.symptoms || '',
    os.cause || '',
    os.actions_executed || '',
    os.parts_replaced || ''
  ].filter(Boolean);
  const rawContent = parts.join('\n');
  if (!rawContent.trim()) return;
  ingestAsync(rawContent, {
    companyId,
    sourceType: SOURCE_TYPES.ORDEM_SERVICO,
    sourceId: os.id,
    scopeHints: { machine: os.machine_id || os.machine_name }
  });
}

/**
 * Obtém contexto de memória (operacional + corporativa) para enriquecer o ChatGPT
 * @param {Object} opts - { companyId, userId, query, req }
 * @returns {Promise<string|null>} Bloco para o system prompt
 */
async function getContextForChat(opts) {
  const { companyId, userId, query, req } = opts;
  if (!companyId) return null;

  const blocks = [];
  const q = (query || '').trim();

  try {
    if (OPERATIONAL_MEMORY_ENABLED) {
      const facts = await operationalMemory.getRelevantContext({
        companyId,
        userId,
        query: q,
        limit: 18
      });
      if (facts.length > 0) {
        await operationalMemory.logAudit({
          companyId,
          userId,
          action: 'query_context',
          scopeFilter: {},
          factsCount: facts.length,
          req
        });
        const block = await claudeService.buildMemoryContextForChat(query, facts);
        if (block) blocks.push(block);
      }
    }

    if (CORPORATE_MEMORY_ENABLED && q) {
      const [kmRows, casosRows] = await Promise.all([
        corporateMemory.getRelevantContext({ companyId, query: q, limit: 10 }),
        corporateMemory.getSimilarMaintenanceCases({ companyId, problema: q, limit: 5 })
      ]);
      const corporateLines = [];
      if (kmRows.length) {
        corporateLines.push('### Histórico operacional:');
        kmRows.forEach((r) => {
          corporateLines.push(`- [${r.tipo_evento}] ${r.descricao}${r.equipamento ? ` (${r.equipamento})` : ''}${r.linha ? ` linha ${r.linha}` : ''} - ${r.data ? new Date(r.data).toLocaleDateString('pt-BR') : ''}`);
        });
      }
      if (casosRows.length) {
        corporateLines.push('\n### Casos de manutenção similares:');
        casosRows.forEach((c) => {
          corporateLines.push(`- ${c.equipamento || ''} linha ${c.linha || '-'}: ${c.problema} → Solução: ${c.solucao || 'N/A'}${c.peca_trocada ? ` (peça: ${c.peca_trocada})` : ''}`);
        });
      }
      if (corporateLines.length) {
        blocks.push(`## Memória corporativa da empresa:\n${corporateLines.join('\n')}`);
      }
    }

    if (!blocks.length) return null;
    return blocks.join('\n\n');
  } catch (err) {
    console.warn('[CLAUDE_ANALYTICS] getContextForChat:', err.message);
    return null;
  }
}

module.exports = {
  ingestAsync,
  ingestChatImpetus,
  ingestInternalChat,
  ingestRegistroInteligente,
  ingestProacao,
  ingestOrdemServico,
  getContextForChat,
  SOURCE_TYPES
};
