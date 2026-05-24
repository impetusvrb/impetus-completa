'use strict';

const omr = require('./zOperationalMemoryRuntime');

const TYPE = 'task';

function recordTask(tenantId, user, task = {}) {
  return omr.record(tenantId, {
    type: TYPE,
    user_id: user?.id || null,
    summary: task.summary || task.title || 'task',
    intent: task.intent || null,
    payload: {
      task_id: task.task_id || null,
      status: task.status || 'prepared',
      assigned_to: task.assigned_to || null,
      due_at: task.due_at || null
    },
    tags: ['task', ...(task.tags || [])],
    domain: task.domain || null,
    correlation_id: task.workflow_id || task.task_id || null
  });
}

function openTasks(tenantId) {
  return omr.list(tenantId, { type: TYPE }).filter((e) => e?.payload?.status !== 'closed');
}

module.exports = { recordTask, openTasks, TYPE };
