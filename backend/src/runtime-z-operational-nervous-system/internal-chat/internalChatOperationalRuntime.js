'use strict';

const flags = require('../config/sz4FeatureFlags');
const store = require('../_core/sz4TenantStore');
const metrics = require('../observability/operationalNervousSystemMetrics');

let _internalChatService = null;
let _systemUserCache = new Map();

async function resolveSystemSenderId(companyId) {
  if (_systemUserCache.has(companyId)) return _systemUserCache.get(companyId);
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT id FROM users
       WHERE company_id = $1 AND active = true AND deleted_at IS NULL
         AND (role ILIKE '%admin%' OR role ILIKE 'ceo')
       ORDER BY hierarchy_level ASC NULLS LAST
       LIMIT 1`,
      [companyId]
    );
    const id = r.rows?.[0]?.id || null;
    _systemUserCache.set(companyId, id);
    return id;
  } catch (_) {
    return null;
  }
}

function buildReintegrationMessage(reminder = {}, task = {}, requesterName = 'Solicitante') {
  const due = reminder.scheduled_at || task.deadline;
  const dueLabel = due
    ? new Date(due).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'prazo definido';
  return [
    '**Runtime Z · Lembrete contextual**',
    '',
    `A entrega "${task.title || reminder.title || 'tarefa operacional'}" solicitada por ${requesterName}`,
    `tem vencimento em ${dueLabel}.`,
    '',
    'Deseja actualizar o status? (Responda na thread — validação humana assistiva.)'
  ].join('\n');
}

async function postThreadReintegration(payload = {}) {
  const { companyId, conversationId, reminder, task, requesterName, io } = payload;
  if (!flags.isReintegrationEnabled()) return { ok: false, reason: 'reintegration_disabled' };
  const pipelineCore = require('../_core/sz4PipelineCore');
  const stage = pipelineCore.resolveStageForTenant(companyId).stage;
  if (!flags.isStageAtLeast(stage, 'SZ4_REINTEGRATION_ACTIVE')) {
    return { ok: false, reason: 'stage_shadow', prepared: true, stage };
  }

  if (!_internalChatService) {
    try { _internalChatService = require('../../services/internalChatService'); } catch (_) {}
  }
  if (!_internalChatService || !conversationId || !companyId) {
    return { ok: false, reason: 'service_unavailable' };
  }

  const senderId = await resolveSystemSenderId(companyId);
  if (!senderId) return { ok: false, reason: 'no_system_sender' };

  const text = buildReintegrationMessage(reminder, task, requesterName);
  const msg = await _internalChatService.sendMessage({
    companyId,
    conversationId,
    senderId,
    messageType: 'text',
    textContent: text,
    source: 'runtime_z_sz4'
  });

  metrics.emit('THREAD_REOPENED', { tenant_id: companyId, conversation_id: conversationId, reminder_id: reminder?.id });
  if (io) {
    io.to(conversationId).emit('sz4_thread_reintegration', { message: msg, reminder_id: reminder?.id });
  }

  if (reminder?.id) {
    store.saveReminder(companyId, { ...reminder, thread_reintegration_pending: false, last_reintegrated_at: new Date().toISOString() });
  }

  return { ok: true, message_id: msg?.id, assistive_only: true, approval_required: true };
}

async function processInternalChatMessage(payload = {}) {
  const core = require('../_core/sz4PipelineCore');
  const result = await core.processOperationalSignal({
    ...payload,
    sourceType: 'chat_interno',
    thread_id: payload.conversationId
  });

  if (result.reminder && flags.isStageAtLeast(result.stage, 'SZ4_REINTEGRATION_ACTIVE')) {
    result.reintegration = {
      prepared: true,
      thread_id: payload.conversationId,
      reminder_id: result.reminder.id,
      note: 'Reintegração na thread ocorre no horário do lembrete contextual (assistive/HITL).'
    };
  }

  return result;
}

module.exports = {
  processInternalChatMessage,
  postThreadReintegration,
  buildReintegrationMessage,
  resolveSystemSenderId
};
