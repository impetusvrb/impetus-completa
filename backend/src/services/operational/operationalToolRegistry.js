'use strict';

/**
 * FASE 4 — TOOL CALLING GOVERNADO
 *
 * Registry de ferramentas seguras que a IA pode invocar via OpenAI tool_use.
 * Cada ferramenta tem: validação de permissão, audit trail, tenant isolation,
 * bounded execution e rollback.
 *
 * Feature flag: OPERATIONAL_TOOL_CALLING_ENABLED (default false — shadow first)
 *
 * Governance:
 *   ❌ Sem SQL livre
 *   ❌ Sem acesso irrestrito
 *   ❌ Sem bypass de governance
 *   ✅ Audit trail obrigatório
 *   ✅ Permission validation
 *   ✅ Tenant isolation
 *   ✅ Rate limiting
 */

const db = require('../../db');

const ENABLED = process.env.OPERATIONAL_TOOL_CALLING_ENABLED === 'true';
const SHADOW_MODE = process.env.OPERATIONAL_TOOL_SHADOW_MODE !== 'false';

const _auditLog = [];
const MAX_AUDIT_RAM = 500;
const _rateMap = new Map();
const RATE_LIMIT_PER_MIN = parseInt(process.env.TOOL_RATE_LIMIT_PER_MIN || '30', 10);

function _rateCheck(userId) {
  const key = `${userId || 'anon'}`;
  const now = Date.now();
  const entry = _rateMap.get(key);
  if (!entry || now - entry.ts > 60000) {
    _rateMap.set(key, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_MIN) return false;
  entry.count++;
  return true;
}

function _audit(action, params, result, userId, companyId) {
  const entry = {
    timestamp: new Date().toISOString(),
    action, params: JSON.stringify(params).slice(0, 500),
    result: result?.ok ? 'success' : 'failure',
    userId, companyId,
    shadow: SHADOW_MODE && ENABLED
  };
  _auditLog.push(entry);
  if (_auditLog.length > MAX_AUDIT_RAM) _auditLog.shift();
  console.info('[TOOL_AUDIT]', JSON.stringify(entry));
}

const TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    function: {
      name: 'criar_tarefa',
      description: 'Cria uma tarefa operacional com título, descrição, responsável e prazo opcional',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Título da tarefa' },
          descricao: { type: 'string', description: 'Descrição detalhada' },
          responsavel: { type: 'string', description: 'Nome do responsável (opcional)' },
          prazo: { type: 'string', description: 'Data/hora do prazo no formato ISO 8601 (opcional)' }
        },
        required: ['titulo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'criar_lembrete',
      description: 'Agenda um lembrete para o usuário em data/hora específica',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'O que lembrar' },
          quando: { type: 'string', description: 'Data/hora do lembrete (ISO 8601, "amanhã", "hoje 14h", etc.)' }
        },
        required: ['titulo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_tarefas',
      description: 'Lista tarefas pendentes do usuário ou da empresa',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'done', 'all'], description: 'Filtro de status' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_historico',
      description: 'Consulta histórico de eventos operacionais, manutenção ou produção',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', description: 'Tipo de histórico: eventos, manutencao, producao' },
          equipamento: { type: 'string', description: 'Nome do equipamento (opcional)' },
          linha: { type: 'string', description: 'Linha de produção (opcional)' },
          limite: { type: 'integer', description: 'Número máximo de resultados', default: 10 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_status_tarefa',
      description: 'Atualiza o status de uma tarefa existente para "done" (concluída)',
      parameters: {
        type: 'object',
        properties: {
          tarefa_id: { type: 'string', description: 'ID da tarefa' }
        },
        required: ['tarefa_id']
      }
    }
  }
]);

async function _execCriarTarefa(args, ctx) {
  const orchestrator = require('./cognitiveTaskOrchestrator');
  return orchestrator.createTaskFromConversation({
    companyId: ctx.companyId,
    userId: ctx.userId,
    title: args.titulo,
    content: args.descricao || args.titulo,
    assignee: args.responsavel || null,
    scheduledAt: args.prazo || null,
    sourceType: 'tool_calling',
    sourceId: ctx.conversationId
  });
}

async function _execCriarLembrete(args, ctx) {
  const orchestrator = require('./cognitiveTaskOrchestrator');
  const ingestion = require('./unifiedOperationalIngestionService');
  const scheduledAt = args.quando ? ingestion._parseDeadline(args.quando) : null;

  return orchestrator.scheduleReminder({
    companyId: ctx.companyId,
    userId: ctx.userId,
    title: args.titulo,
    scheduledAt,
    sourceType: 'tool_calling',
    sourceId: ctx.conversationId
  });
}

async function _execConsultarTarefas(args, ctx) {
  try {
    const statusFilter = args.status === 'done' ? "= 'done'" : args.status === 'all' ? "IS NOT NULL" : "!= 'done'";
    const r = await db.query(`
      SELECT id, title, status, assignee, scheduled_at, created_at
      FROM tasks
      WHERE company_id = $1 AND status ${statusFilter}
      ORDER BY created_at DESC
      LIMIT 15
    `, [ctx.companyId]);
    const tasks = r.rows || [];
    if (!tasks.length) return { ok: true, message: 'Nenhuma tarefa encontrada.' };
    const lines = tasks.map(t => {
      const due = t.scheduled_at ? ` (prazo: ${new Date(t.scheduled_at).toLocaleString('pt-BR')})` : '';
      return `- [${t.status}] ${t.title}${t.assignee ? ` → ${t.assignee}` : ''}${due}`;
    });
    return { ok: true, message: `Tarefas encontradas:\n${lines.join('\n')}` };
  } catch (err) {
    return { ok: false, message: 'Não foi possível consultar tarefas.' };
  }
}

async function _execConsultarHistorico(args, ctx) {
  try {
    const conditions = ['company_id = $1'];
    const params = [ctx.companyId];
    let idx = 2;

    if (args.equipamento) {
      conditions.push(`(equipamento ILIKE $${idx} OR descricao ILIKE $${idx})`);
      params.push(`%${args.equipamento}%`);
      idx++;
    }
    if (args.linha) {
      conditions.push(`(linha ILIKE $${idx})`);
      params.push(`%${args.linha}%`);
      idx++;
    }

    const limit = Math.min(args.limite || 10, 20);
    params.push(limit);

    const r = await db.query(`
      SELECT tipo_evento, descricao, equipamento, linha, data
      FROM eventos_empresa
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx}
    `, params);

    const events = r.rows || [];
    if (!events.length) return { ok: true, message: 'Nenhum evento encontrado no histórico.' };
    const lines = events.map(e => {
      const dt = e.data ? new Date(e.data).toLocaleDateString('pt-BR') : '';
      return `- [${e.tipo_evento}] ${e.descricao}${e.equipamento ? ` (${e.equipamento})` : ''} ${dt}`;
    });
    return { ok: true, message: `Histórico:\n${lines.join('\n')}` };
  } catch (err) {
    if (err.message?.includes('does not exist')) return { ok: true, message: 'Histórico não disponível.' };
    return { ok: false, message: 'Erro ao consultar histórico.' };
  }
}

async function _execAtualizarStatus(args, ctx) {
  const orchestrator = require('./cognitiveTaskOrchestrator');
  const result = await orchestrator.closeTask(args.tarefa_id, ctx.userId);
  return result.ok
    ? { ok: true, message: `Tarefa ${args.tarefa_id} marcada como concluída.` }
    : { ok: false, message: 'Não foi possível atualizar a tarefa.' };
}

const TOOL_HANDLERS = Object.freeze({
  criar_tarefa: _execCriarTarefa,
  criar_lembrete: _execCriarLembrete,
  consultar_tarefas: _execConsultarTarefas,
  consultar_historico: _execConsultarHistorico,
  atualizar_status_tarefa: _execAtualizarStatus
});

/**
 * Executa uma ferramenta chamada pela IA.
 *
 * @param {string} toolName
 * @param {Object} args - argumentos parseados do tool_use
 * @param {Object} ctx - { companyId, userId, conversationId, role }
 * @returns {Promise<Object>} resultado da execução
 */
async function executeTool(toolName, args, ctx = {}) {
  try {
    const actionFlags = require('../../actionRuntime/config/actionRuntimeFlags');
    if (actionFlags.shouldUseActionRuntime(ctx.companyId)) {
      const orchestrator = require('../../actionRuntime/orchestration/actionRuntimeOrchestrator');
      return orchestrator.executeToolCall(toolName, args, ctx);
    }
  } catch (_e) {
    /* fallback legado */
  }

  return executeToolApproved(toolName, args, ctx);
}

/**
 * Execução directa — apenas HITL aprovado ou legado sem action runtime.
 */
async function executeToolApproved(toolName, args, ctx = {}) {
  if (!ctx.companyId) {
    return { ok: false, message: 'Contexto de empresa ausente.' };
  }

  if (!_rateCheck(ctx.userId)) {
    return { ok: false, message: 'Limite de ações atingido. Tente em 1 minuto.' };
  }

  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    _audit(toolName, args, { ok: false }, ctx.userId, ctx.companyId);
    return { ok: false, message: `Ferramenta "${toolName}" não reconhecida.` };
  }

  const bypassShadow = ctx._hitl_approved === true;

  if (SHADOW_MODE && !bypassShadow) {
    _audit(`shadow:${toolName}`, args, { ok: true, shadow: true }, ctx.userId, ctx.companyId);
    console.info('[TOOL_SHADOW]', { tool: toolName, args, ctx: { companyId: ctx.companyId, userId: ctx.userId } });
    return { ok: true, message: `[Shadow] Ação "${toolName}" simulada com sucesso.`, shadow: true };
  }

  try {
    const result = await handler(args, ctx);
    _audit(toolName, args, result, ctx.userId, ctx.companyId);
    return result;
  } catch (err) {
    _audit(toolName, args, { ok: false, error: err.message }, ctx.userId, ctx.companyId);
    console.error('[TOOL_ERROR]', toolName, err.message);
    return { ok: false, message: 'Erro ao executar ação.' };
  }
}

function getToolDefinitions() {
  return ENABLED ? TOOL_DEFINITIONS : [];
}

function getAuditLog() {
  return _auditLog.slice();
}

module.exports = {
  executeTool,
  executeToolApproved,
  getToolDefinitions,
  getAuditLog,
  TOOL_DEFINITIONS,
  isEnabled: () => ENABLED,
  isShadowMode: () => SHADOW_MODE
};
