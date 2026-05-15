'use strict';

/**
 * FASE 1 — MEMORY BINDING CONSOLIDATION
 *
 * Camada unificada que consulta TODAS as fontes de memória operacional
 * e monta um bloco de contexto enriquecido para injeção no prompt da IA.
 *
 * Feature flag: MEMORY_BINDING_ENABLED (default true)
 *
 * Fontes:
 *   1. operationalMemoryService  (fatos estruturados)
 *   2. corporateMemoryService    (knowledge_memory, casos_manutencao)
 *   3. claudeAnalyticsService    (getContextForChat — resumo Claude)
 *   4. tasks                     (tarefas pendentes do usuário/empresa)
 *   5. reminderSchedulerService  (lembretes próximos)
 *
 * Governance:
 *   - tenant isolation (company_id obrigatório)
 *   - role isolation (filtragem por scope)
 *   - LGPD compliance (apenas dados autorizados)
 */

const db = require('../../db');

const ENABLED = process.env.MEMORY_BINDING_ENABLED !== 'false';
const MAX_FACTS = parseInt(process.env.MEMORY_BINDING_MAX_FACTS || '15', 10);
const MAX_TASKS = parseInt(process.env.MEMORY_BINDING_MAX_TASKS || '10', 10);
const MAX_EVENTS = parseInt(process.env.MEMORY_BINDING_MAX_EVENTS || '10', 10);

let _operationalMemory = null;
let _corporateMemory = null;
let _claudeAnalytics = null;

function _loadDeps() {
  if (!_operationalMemory) {
    try { _operationalMemory = require('../operationalMemoryService'); } catch (_) { _operationalMemory = null; }
  }
  if (!_corporateMemory) {
    try { _corporateMemory = require('../corporateMemoryService'); } catch (_) { _corporateMemory = null; }
  }
  if (!_claudeAnalytics) {
    try { _claudeAnalytics = require('../claudeAnalyticsService'); } catch (_) { _claudeAnalytics = null; }
  }
}

async function _getOperationalFacts(companyId, query, scopeFilters) {
  if (!_operationalMemory) return [];
  try {
    return await _operationalMemory.getRelevantContext({
      companyId,
      query,
      limit: MAX_FACTS,
      scopeFilters,
      includePriority: ['critica', 'alta', 'normal']
    });
  } catch (err) {
    console.warn('[MEMORY_BINDING] operationalFacts:', err.message);
    return [];
  }
}

async function _getCorporateContext(companyId, query) {
  if (!_corporateMemory) return { knowledge: [], cases: [] };
  try {
    const [knowledge, cases] = await Promise.all([
      _corporateMemory.getRelevantContext({ companyId, query, limit: MAX_EVENTS }),
      _corporateMemory.getSimilarMaintenanceCases({ companyId, problema: query, limit: 5 })
    ]);
    return { knowledge: knowledge || [], cases: cases || [] };
  } catch (err) {
    console.warn('[MEMORY_BINDING] corporateContext:', err.message);
    return { knowledge: [], cases: [] };
  }
}

async function _getPendingTasks(companyId, userId) {
  try {
    const sql = `
      SELECT t.id, t.title, t.description, t.status, t.assignee, t.scheduled_at, t.created_at
      FROM tasks t
      WHERE t.company_id = $1 AND t.status != 'done'
        ${userId ? "AND (t.assigned_to = $2 OR t.assignee ILIKE '%' || (SELECT split_part(name, ' ', 1) FROM users WHERE id = $2 LIMIT 1) || '%')" : ''}
      ORDER BY
        CASE WHEN t.scheduled_at IS NOT NULL AND t.scheduled_at <= now() + interval '24 hours' THEN 0 ELSE 1 END,
        t.scheduled_at ASC NULLS LAST,
        t.created_at DESC
      LIMIT $${userId ? '3' : '2'}
    `;
    const params = userId ? [companyId, userId, MAX_TASKS] : [companyId, MAX_TASKS];
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('assigned_to')) return [];
    console.warn('[MEMORY_BINDING] pendingTasks:', err.message);
    return [];
  }
}

async function _getUpcomingReminders(companyId) {
  try {
    const r = await db.query(`
      SELECT id, title, scheduled_at, assignee
      FROM tasks
      WHERE company_id = $1 AND status != 'done'
        AND scheduled_at IS NOT NULL
        AND scheduled_at > now()
        AND scheduled_at <= now() + interval '48 hours'
        AND reminder_sent_at IS NULL
      ORDER BY scheduled_at ASC
      LIMIT 5
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist')) return [];
    console.warn('[MEMORY_BINDING] reminders:', err.message);
    return [];
  }
}

async function _getRecentEvents(companyId) {
  try {
    const r = await db.query(`
      SELECT tipo_evento, descricao, equipamento, linha, data
      FROM eventos_empresa
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [companyId, MAX_EVENTS]);
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist')) return [];
    console.warn('[MEMORY_BINDING] recentEvents:', err.message);
    return [];
  }
}

function _formatFacts(facts) {
  if (!facts.length) return '';
  const lines = facts.map(f =>
    `- [${f.fact_type}/${f.priority}] ${f.content}${f.scope_label ? ` (${f.scope_label})` : ''}`
  );
  return `### Fatos operacionais recentes:\n${lines.join('\n')}`;
}

function _formatTasks(tasks) {
  if (!tasks.length) return '';
  const lines = tasks.map(t => {
    const due = t.scheduled_at ? ` (prazo: ${new Date(t.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})` : '';
    return `- [${t.status}] ${t.title}${t.assignee ? ` → ${t.assignee}` : ''}${due}`;
  });
  return `### Tarefas pendentes:\n${lines.join('\n')}`;
}

function _formatReminders(reminders) {
  if (!reminders.length) return '';
  const lines = reminders.map(r => {
    const when = new Date(r.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return `- ${r.title} → ${when}${r.assignee ? ` (${r.assignee})` : ''}`;
  });
  return `### Lembretes próximos (48h):\n${lines.join('\n')}`;
}

function _formatEvents(events) {
  if (!events.length) return '';
  const lines = events.map(e => {
    const dt = e.data ? new Date(e.data).toLocaleDateString('pt-BR') : '';
    return `- [${e.tipo_evento}] ${e.descricao}${e.equipamento ? ` (${e.equipamento})` : ''}${e.linha ? ` L${e.linha}` : ''} ${dt}`;
  });
  return `### Eventos recentes da empresa:\n${lines.join('\n')}`;
}

function _formatKnowledge(knowledge) {
  if (!knowledge.length) return '';
  const lines = knowledge.slice(0, 8).map(k =>
    `- [${k.tipo_evento}] ${k.descricao}${k.equipamento ? ` (${k.equipamento})` : ''}`
  );
  return `### Histórico operacional:\n${lines.join('\n')}`;
}

function _formatCases(cases) {
  if (!cases.length) return '';
  const lines = cases.map(c =>
    `- ${c.equipamento || '?'}: ${c.problema} → ${c.solucao || 'N/A'}${c.peca_trocada ? ` (peça: ${c.peca_trocada})` : ''}`
  );
  return `### Casos de manutenção similares:\n${lines.join('\n')}`;
}

/**
 * Monta bloco de contexto completo para injeção no system prompt.
 *
 * @param {Object} opts
 * @param {string} opts.companyId - UUID da empresa
 * @param {string} [opts.userId] - UUID do usuário
 * @param {string} [opts.query] - mensagem/pergunta do usuário
 * @param {Object} [opts.scopeFilters] - filtros de escopo (scope_type, scope_id)
 * @param {Object} [opts.req] - request para auditoria
 * @returns {Promise<{block: string|null, meta: Object}>}
 */
async function buildOperationalContext(opts = {}) {
  if (!ENABLED) return { block: null, meta: { enabled: false } };

  const { companyId, userId, query = '', scopeFilters = {}, req } = opts;
  if (!companyId) return { block: null, meta: { skipped: 'no_company' } };

  _loadDeps();

  const startMs = Date.now();

  const [facts, corporate, tasks, reminders, events] = await Promise.all([
    _getOperationalFacts(companyId, query, scopeFilters),
    _getCorporateContext(companyId, query),
    _getPendingTasks(companyId, userId),
    _getUpcomingReminders(companyId),
    _getRecentEvents(companyId)
  ]);

  if (_operationalMemory && facts.length > 0) {
    try {
      await _operationalMemory.logAudit({
        companyId, userId, action: 'memory_binding_query',
        scopeFilter: scopeFilters, factsCount: facts.length, req
      });
    } catch (_) { /* audit non-critical */ }
  }

  const sections = [
    '## MEMÓRIA OPERACIONAL IMPETUS (contexto em tempo real)',
    _formatFacts(facts),
    _formatTasks(tasks),
    _formatReminders(reminders),
    _formatEvents(events),
    _formatKnowledge(corporate.knowledge),
    _formatCases(corporate.cases)
  ].filter(Boolean);

  if (sections.length <= 1) {
    return { block: null, meta: { empty: true, durationMs: Date.now() - startMs } };
  }

  sections.push(
    '\n---',
    'INSTRUÇÃO: Use os dados acima como contexto factual. Não invente informações além do que está listado.',
    'Se o usuário pedir algo que exija ação (tarefa, lembrete, alerta), indique que a funcionalidade está disponível.'
  );

  const block = sections.join('\n\n');

  return {
    block,
    meta: {
      factsCount: facts.length,
      tasksCount: tasks.length,
      remindersCount: reminders.length,
      eventsCount: events.length,
      knowledgeCount: corporate.knowledge.length,
      casesCount: corporate.cases.length,
      durationMs: Date.now() - startMs
    }
  };
}

module.exports = {
  buildOperationalContext,
  isEnabled: () => ENABLED
};
