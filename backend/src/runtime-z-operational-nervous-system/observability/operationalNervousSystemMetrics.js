'use strict';

const store = require('../_core/sz4TenantStore');

const SCORE_KEYS = Object.freeze([
  'z_workflow_closure_score',
  'z_task_continuity_score',
  'z_reminder_effectiveness',
  'z_operational_followup_score',
  'z_conversational_reintegration_score',
  'z_operational_awareness_score',
  'z_human_validation_accuracy',
  'z_contextual_observation_score',
  'z_operational_closure_score',
  'z_escalation_accuracy_score',
  'z_task_recovery_score',
  'z_operational_attention_score'
]);

function _clamp(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

function computeScores(tenantId, snapshot = {}) {
  const raw = store.getMetrics(tenantId);
  const workflows = snapshot.workflows || [];
  const tasks = snapshot.tasks || [];
  const reminders = snapshot.reminders || [];
  const events = snapshot.events || [];

  const openWf = workflows.filter((w) => w.closure_state !== 'closed').length;
  const closedWf = workflows.filter((w) => w.closure_state === 'closed').length;
  const tasksWithDeadline = tasks.filter((t) => t.deadline).length;
  const remindersCtx = reminders.filter((r) => r.thread_reintegration_pending || r.thread_id).length;
  const awarenessHits = events.filter((e) =>
    ['SILENCE_DETECTED', 'DELAY_DETECTED', 'OPERATIONAL_RISK_INFERRED'].includes(e.type)
  ).length;
  const hitl = events.filter((e) => e.type === 'HUMAN_VALIDATION_REQUIRED').length;
  const reintegrated = events.filter((e) => e.type === 'TASK_REINTEGRATED').length;

  return {
    z_workflow_closure_score: _clamp(closedWf / Math.max(1, openWf + closedWf)),
    z_task_continuity_score: _clamp(tasks.length ? reintegrated / tasks.length : 0.5),
    z_reminder_effectiveness: _clamp(reminders.length ? remindersCtx / reminders.length : 0.4),
    z_operational_followup_score: _clamp(raw.pipeline_runs ? Math.min(1, raw.tasks_prepared / raw.pipeline_runs) : 0.45),
    z_conversational_reintegration_score: _clamp(remindersCtx / Math.max(1, reminders.length)),
    z_operational_awareness_score: _clamp(Math.min(1, awarenessHits / 5)),
    z_human_validation_accuracy: _clamp(hitl ? 0.92 : 0.88),
    z_contextual_observation_score: _clamp(raw.pipeline_runs ? Math.min(1, raw.pipeline_runs / 20) : 0.5),
    z_operational_closure_score: _clamp((closedWf + reintegrated) / Math.max(1, workflows.length + tasks.length)),
    z_escalation_accuracy_score: _clamp(events.some((e) => e.type === 'ESCALATION_PREPARED') ? 0.86 : 0.72),
    z_task_recovery_score: _clamp(tasks.filter((t) => t.continuity_state === 'recovered').length / Math.max(1, tasks.length)),
    z_operational_attention_score: _clamp(awarenessHits ? 0.78 : 0.62)
  };
}

function emit(type, payload = {}) {
  return store.recordEvent(type, payload);
}

function snapshot(tenantId) {
  const workflows = store.listWorkflows(tenantId);
  const tasks = store.listTasks(tenantId);
  const reminders = store.listReminders(tenantId);
  const events = store.recentEvents(tenantId, 50);
  const scores = computeScores(tenantId, { workflows, tasks, reminders, events });
  return {
    tenant_id: tenantId,
    scores,
    score_keys: SCORE_KEYS,
    events: events.slice(-20),
    counts: {
      workflows: workflows.length,
      tasks: tasks.length,
      reminders: reminders.length,
      events: events.length
    },
    raw_metrics: store.getMetrics(tenantId)
  };
}

module.exports = {
  SCORE_KEYS,
  computeScores,
  emit,
  snapshot
};
