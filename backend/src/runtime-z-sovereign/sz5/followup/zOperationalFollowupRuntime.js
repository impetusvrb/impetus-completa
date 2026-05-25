'use strict';

const flags = require('../config/sz5FeatureFlags');

function inferOperationalObjects(tenantId, indexRecord = {}) {
  if (!flags.isEnabled()) return { objects: [] };
  const objects = [];
  if (indexRecord.requires_reminder) {
    objects.push({
      type: 'reminder',
      tenant_id: tenantId,
      thread_id: indexRecord.thread_id,
      summary: indexRecord.conversation_signature,
      workflow_type: indexRecord.workflow_type
    });
  }
  if (indexRecord.requires_followup) {
    objects.push({
      type: 'followup',
      tenant_id: tenantId,
      thread_id: indexRecord.thread_id,
      intent: indexRecord.intent
    });
  }
  if (indexRecord.workflow_type === 'meeting') {
    objects.push({
      type: 'meeting_object',
      tenant_id: tenantId,
      thread_id: indexRecord.thread_id,
      temporal: indexRecord.temporal_markers
    });
  }
  if (indexRecord.requires_escalation) {
    objects.push({ type: 'escalation', tenant_id: tenantId, thread_id: indexRecord.thread_id });
  }
  if (indexRecord.workflow_type === 'task') {
    objects.push({ type: 'operational_task', tenant_id: tenantId, thread_id: indexRecord.thread_id });
  }
  return { objects };
}

module.exports = { inferOperationalObjects };
