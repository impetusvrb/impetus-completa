'use strict';

const flags = require('../config/sz4FeatureFlags');
const store = require('../_core/sz4TenantStore');
const metrics = require('../observability/operationalNervousSystemMetrics');
const reintegration = require('../internal-chat/internalChatOperationalRuntime');

const ADVANCE_MIN = parseInt(process.env.IMPETUS_TASK_REMINDER_ADVANCE_MIN || '70', 10);

async function processDueReminders(companyId, opts = {}) {
  if (!flags.isEnabled() || !flags.isReminderEnabled()) {
    return { ok: true, processed: 0, skipped: true };
  }

  const stage = require('../_core/sz4PipelineCore').resolveStageForTenant(companyId).stage;
  const now = opts.now ? new Date(opts.now) : new Date();
  const reminders = store.listReminders(companyId);
  let processed = 0;

  for (const reminder of reminders) {
    if (reminder.status !== 'scheduled' || !reminder.scheduled_at || !reminder.thread_id) continue;
    const due = new Date(reminder.scheduled_at);
    const triggerAt = new Date(due.getTime() - ADVANCE_MIN * 60000);
    if (now < triggerAt) continue;
    if (reminder.last_reintegrated_at) continue;

    const task = store.listTasks(companyId, reminder.thread_id).find((t) => t.id === reminder.task_id) || {};

    if (flags.isStageAtLeast(stage, 'SZ4_REINTEGRATION_ACTIVE')) {
      await reintegration.postThreadReintegration({
        companyId,
        conversationId: reminder.thread_id,
        reminder,
        task,
        requesterName: opts.requesterName || 'Solicitante',
        io: opts.io
      });
    }

    store.saveReminder(companyId, { ...reminder, status: 'notified', notified_at: now.toISOString() });
    metrics.emit('REMINDER_CONTEXTUALIZED', { tenant_id: companyId, reminder_id: reminder.id });
    processed += 1;
  }

  return { ok: true, processed, stage, assistive_only: true };
}

module.exports = { processDueReminders, ADVANCE_MIN };
