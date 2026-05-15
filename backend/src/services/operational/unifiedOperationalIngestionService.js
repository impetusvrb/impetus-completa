'use strict';

/**
 * FASE 2 — INGESTÃO COGNITIVA UNIFICADA
 *
 * Gateway unificado para ingestão de TODA interação operacional.
 * Normaliza, classifica, extrai entidades (tarefas, prazos, responsáveis, riscos)
 * e persiste na memória operacional + corporativa.
 *
 * Feature flag: UNIFIED_INGESTION_ENABLED (default true)
 *
 * Fontes suportadas:
 *   chat_impetus, chat_interno, avatar_realtime, voice_transcript,
 *   registro_inteligente, cadastrar_ia, proacao, relatorio, feedback,
 *   upload, ordem_servico
 */

const ENABLED = process.env.UNIFIED_INGESTION_ENABLED !== 'false';

const SOURCE_TYPES = Object.freeze({
  CHAT_IMPETUS: 'chat_impetus',
  CHAT_INTERNO: 'chat_interno',
  AVATAR_REALTIME: 'avatar_realtime',
  VOICE_TRANSCRIPT: 'voice_transcript',
  REGISTRO_INTELIGENTE: 'registro_inteligente',
  CADASTRAR_IA: 'cadastrar_ia',
  PROACAO: 'proacao',
  RELATORIO: 'relatorio',
  FEEDBACK: 'feedback',
  UPLOAD: 'upload',
  ORDEM_SERVICO: 'ordem_servico'
});

const _throttle = new Map();
const THROTTLE_MS = 1500;

const NLP_PATTERNS = Object.freeze({
  TASK: /(?:preciso|necessito|favor|por favor|pode|poderia|peço|solicito)\s+(?:que|de|para)?\s*(.{5,80})/i,
  DEADLINE: /(?:até|antes de|prazo|deadline|entregar|data limite)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\d{1,2}\s*h(?:oras?)?|\d{1,2}:\d{2}|amanhã|hoje|segunda|terça|quarta|quinta|sexta)/i,
  REMINDER: /(?:me\s+lembr[ea]|não\s+esquec|lembrar|lembrete|avise[- ]me|alertar|remind)/i,
  URGENT: /(?:urgente|urgência|crítico|imediato|prioridade\s+máxima|emergência|parada|parou)/i,
  PENDING: /(?:pendente|pendência|falta|incompleto|não\s+foi\s+feito|aguardando)/i,
  REPORT: /(?:relatório|report|resumo|balanço|análise|diagnóstico|laudo)/i,
  ASSIGNEE: /(?:para\s+o\s+|para\s+a\s+|para\s+|responsável\s+|atribuir\s+a\s+|designar\s+|envie\s+para\s+|encaminhe\s+para\s+)([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/,
  RISK: /(?:risco|perigo|alerta|atenção|cuidado|falha|quebra|vazamento|contaminação)/i,
  COMMITMENT: /(?:prometo|vou\s+fazer|comprometo|garanto|me\s+comprometo|faço\s+isso)/i,
  SEND_DOC: /(?:envie|encaminhe|mande|prepare\s+e\s+envie|gere\s+e\s+envie)\s+(?:o?\s*(?:relatório|documento|laudo|pdf|arquivo))/i
});

function _extractEntities(text) {
  if (!text || typeof text !== 'string') return {};
  const t = text.trim();
  const entities = {};

  for (const [key, pattern] of Object.entries(NLP_PATTERNS)) {
    const match = t.match(pattern);
    if (match) {
      entities[key.toLowerCase()] = {
        detected: true,
        match: (match[1] || match[0]).trim().slice(0, 200)
      };
    }
  }

  return entities;
}

function _classifyPriority(entities) {
  if (entities.urgent) return 'critica';
  if (entities.deadline || entities.risk) return 'alta';
  if (entities.task || entities.reminder || entities.pending) return 'normal';
  return 'baixa';
}

function _classifyFactType(entities, sourceType) {
  if (entities.task || entities.commitment) return 'tarefa';
  if (entities.reminder) return 'solicitacao';
  if (entities.risk || entities.urgent) return 'risco';
  if (entities.pending) return 'pendencia';
  if (entities.report || entities.send_doc) return 'solicitacao';
  if (sourceType === SOURCE_TYPES.FEEDBACK) return 'feedback';
  return 'informacao';
}

function _parseDeadline(deadlineMatch) {
  if (!deadlineMatch) return null;
  const raw = deadlineMatch.toLowerCase().trim();
  const now = new Date();

  if (raw === 'hoje') {
    now.setHours(18, 0, 0, 0);
    return now.toISOString();
  }
  if (raw === 'amanhã') {
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    return now.toISOString();
  }

  const dayMap = { segunda: 1, terça: 2, quarta: 3, quinta: 4, sexta: 5 };
  for (const [name, day] of Object.entries(dayMap)) {
    if (raw.includes(name)) {
      const diff = (day - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + diff);
      now.setHours(9, 0, 0, 0);
      return now.toISOString();
    }
  }

  const timeMatch = raw.match(/(\d{1,2})\s*h/);
  if (timeMatch) {
    now.setHours(parseInt(timeMatch[1], 10), 0, 0, 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  const dateMatch = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10)) : now.getFullYear();
    const d = new Date(year, month, day, 9, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

/**
 * Ingere conteúdo de qualquer fonte no sistema de memória operacional.
 * Assíncrono (fire-and-forget). Falhas são logadas, nunca bloqueiam.
 *
 * @param {Object} params
 * @param {string} params.content - texto bruto
 * @param {string} params.companyId - UUID da empresa
 * @param {string} params.sourceType - tipo da fonte (SOURCE_TYPES)
 * @param {string} [params.sourceId] - ID da fonte
 * @param {string} [params.userId] - UUID do usuário
 * @param {Object} [params.metadata] - metadados adicionais
 */
function ingest(params = {}) {
  if (!ENABLED) return;
  const { content, companyId, sourceType, sourceId, userId, metadata = {} } = params;
  if (!companyId || !content || typeof content !== 'string' || content.trim().length < 5) return;

  const now = Date.now();
  const throttleKey = `${companyId}:${sourceType}`;
  if (now - (_throttle.get(throttleKey) || 0) < THROTTLE_MS) return;
  _throttle.set(throttleKey, now);

  setImmediate(() => {
    _processIngestion(params).catch(err => {
      console.warn('[UNIFIED_INGESTION] error:', err.message);
    });
  });
}

async function _processIngestion(params) {
  const { content, companyId, sourceType, sourceId, userId, metadata = {} } = params;
  const entities = _extractEntities(content);
  const priority = _classifyPriority(entities);
  const factType = _classifyFactType(entities, sourceType);

  let claudeAnalytics = null;
  try { claudeAnalytics = require('../claudeAnalyticsService'); } catch (_) {}

  if (claudeAnalytics) {
    claudeAnalytics.ingestAsync(content, {
      companyId,
      sourceType: sourceType || 'generic',
      sourceId: sourceId || null,
      sourceMetadata: { ...metadata, userId, entities, priority },
      scopeHints: metadata.scopeHints || {}
    });
  }

  let operationalMemory = null;
  try { operationalMemory = require('../operationalMemoryService'); } catch (_) {}

  if (operationalMemory && (priority !== 'baixa' || factType !== 'informacao')) {
    try {
      await operationalMemory.storeFacts({
        companyId,
        facts: [{
          scope_type: metadata.scopeType || 'org',
          scope_id: metadata.scopeId || null,
          scope_label: metadata.scopeLabel || sourceType,
          fact_type: factType,
          content: content.slice(0, 4000),
          summary: content.slice(0, 300),
          priority,
          metadata: { entities, sourceType, sourceId, userId }
        }],
        sourceType,
        sourceId,
        sourceMetadata: { ...metadata, userId }
      });
    } catch (err) {
      console.warn('[UNIFIED_INGESTION] storeFacts:', err.message);
    }
  }

  if (entities.task || entities.reminder || entities.commitment) {
    try {
      const orchestrator = require('./cognitiveTaskOrchestrator');
      if (orchestrator.isEnabled()) {
        const deadline = entities.deadline ? _parseDeadline(entities.deadline.match) : null;
        const assignee = entities.assignee ? entities.assignee.match : null;

        if (entities.reminder?.detected) {
          await orchestrator.scheduleReminder({
            companyId, userId, title: content.slice(0, 200),
            scheduledAt: deadline, sourceType, sourceId
          });
        } else if (entities.task?.detected || entities.commitment?.detected) {
          await orchestrator.createTaskFromConversation({
            companyId, userId, content, title: entities.task?.match || content.slice(0, 200),
            assignee, scheduledAt: deadline, sourceType, sourceId,
            priority: priority === 'critica' ? 'critica' : 'normal'
          });
        }
      }
    } catch (err) {
      console.warn('[UNIFIED_INGESTION] task_orchestrator:', err.message);
    }
  }

  console.info('[UNIFIED_INGESTION]', {
    sourceType, factType, priority,
    entitiesDetected: Object.keys(entities).length,
    hasTask: !!entities.task, hasReminder: !!entities.reminder,
    hasDeadline: !!entities.deadline, hasUrgent: !!entities.urgent
  });
}

module.exports = {
  ingest,
  SOURCE_TYPES,
  _extractEntities,
  _parseDeadline,
  _classifyPriority,
  _classifyFactType,
  isEnabled: () => ENABLED
};
