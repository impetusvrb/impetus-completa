'use strict';

const flags = require('../config/sz5FeatureFlags');
const intentEx = require('./zConversationIntentExtractor');
const temporalEx = require('./zTemporalExtractor');
const actorEx = require('./zActorExtractor');
const persistence = require('../persistence/zConversationIndexPersistence');
const convMem = require('../../../runtime-z-cognitive-os/memory/zConversationMemoryGraph');
const omr = require('../../../runtime-z-cognitive-os/memory/zOperationalMemoryRuntime');
const observability = require('../observability/zConversationalObservabilityRuntime');
const followup = require('../followup/zOperationalFollowupRuntime');

function buildIndexRecord(message = {}, participants = []) {
  const content = String(message.content || '').trim();
  const intentPack = intentEx.extractIntent(content);
  const temporal = temporalEx.extractTemporal(content);
  const actors = actorEx.extractActors(message, participants);

  return {
    message_id: message.message_id || message.id,
    thread_id: message.thread_id || message.conversation_id,
    tenant_id: message.tenant_id || message.company_id,
    actors,
    entities: intentPack.operational_domains,
    intent: intentPack.intent,
    workflow_type: intentPack.workflow_type,
    temporal_markers: temporal.temporal_markers,
    priority: intentPack.requires_escalation ? 'alta' : temporal.has_deadline ? 'normal' : 'baixa',
    operational_relevance: intentPack.workflow_type === 'meeting' || intentPack.requires_followup ? 'high' : 'medium',
    requires_followup: intentPack.requires_followup,
    requires_reminder: intentPack.requires_reminder,
    requires_escalation: intentPack.requires_escalation,
    related_incidents: intentPack.operational_domains.includes('incidente') ? ['inferred'] : [],
    related_tasks: intentPack.workflow_type === 'task' ? ['inferred'] : [],
    related_workflows: [intentPack.workflow_type],
    operational_domain: intentPack.operational_domains[0] || 'general',
    organizational_impact: intentPack.requires_escalation ? 'elevated' : 'local',
    continuity_signature: `${message.thread_id || ''}:${intentPack.workflow_type}`,
    conversation_signature: content.slice(0, 120),
    actor_graph_links: actors.map((a) => ({ ref: a.user_id || a.name, role: a.source }))
  };
}

async function indexChatMessage(payload = {}) {
  if (!flags.isEnabled() || !flags.isIndexingEnabled()) {
    return { ok: false, skipped: true };
  }

  const {
    tenantId,
    message,
    participants = []
  } = payload;

  if (!tenantId || !message?.content) return { ok: false, reason: 'missing_params' };

  const indexRecord = buildIndexRecord(
    {
      ...message,
      tenant_id: tenantId,
      company_id: tenantId
    },
    participants
  );

  const persist = await persistence.upsertIndexRecord(
    tenantId,
    indexRecord.message_id,
    indexRecord.thread_id,
    message.sender_id,
    indexRecord,
    String(message.content).slice(0, 4000)
  );

  try {
    convMem.recordTurn(tenantId, { id: message.sender_id }, {
      message: message.content,
      conversation_id: indexRecord.thread_id,
      summary: indexRecord.conversation_signature,
      intent: indexRecord.intent,
      tags: indexRecord.entities
    });
    omr.record(tenantId, {
      type: 'sz5_chat_index',
      user_id: message.sender_id,
      summary: indexRecord.conversation_signature,
      intent: indexRecord.intent,
      payload: indexRecord,
      tags: indexRecord.entities,
      correlation_id: indexRecord.thread_id
    });
  } catch (_) {}

  try {
    followup.inferOperationalObjects(tenantId, indexRecord);
    observability.recordIndex();
  } catch (_) {}

  return { ok: true, indexRecord, persisted: persist.ok };
}

module.exports = {
  buildIndexRecord,
  indexChatMessage
};
