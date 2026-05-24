'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/sz4FeatureFlags');

const _workflows = new Map();
const _tasks = new Map();
const _reminders = new Map();
const _threads = new Map();
const _events = [];
const _metrics = new Map();
const _obsBudget = new Map();

const MAX_EVENTS = 500;
const MAX_PER_TENANT = flags.isPersistenceEnabled() ? 5000 : 800;

function _tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function _trimTenant(store, tenantId) {
  const prefix = `${_tenantKey(tenantId)}:`;
  const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
  if (keys.length <= MAX_PER_TENANT) return;
  keys.sort();
  for (let i = 0; i < keys.length - MAX_PER_TENANT; i++) {
    store.delete(keys[i]);
  }
}

function recordEvent(type, payload = {}) {
  const evt = { id: uuidv4(), type, at: new Date().toISOString(), ...payload };
  _events.push(evt);
  if (_events.length > MAX_EVENTS) _events.shift();
  return evt;
}

function bumpMetric(tenantId, key, delta = 1) {
  const tk = `${_tenantKey(tenantId)}:${key}`;
  _metrics.set(tk, (_metrics.get(tk) || 0) + delta);
}

function getMetrics(tenantId) {
  const prefix = `${_tenantKey(tenantId)}:`;
  const out = {};
  for (const [k, v] of _metrics.entries()) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  }
  return out;
}

function consumeObservationBudget(tenantId) {
  const hourKey = `${_tenantKey(tenantId)}:${new Date().toISOString().slice(0, 13)}`;
  const used = _obsBudget.get(hourKey) || 0;
  const budget = flags.observationBudgetPerHour();
  if (used >= budget) return { allowed: false, used, budget };
  _obsBudget.set(hourKey, used + 1);
  return { allowed: true, used: used + 1, budget };
}

function upsertThreadContext(tenantId, threadId, patch = {}) {
  const key = `${_tenantKey(tenantId)}:${threadId}`;
  const prev = _threads.get(key) || { thread_id: threadId, messages: [], entities: {} };
  const next = {
    ...prev,
    ...patch,
    updated_at: new Date().toISOString(),
    messages: [...(prev.messages || []), ...(patch.messages || [])].slice(-40)
  };
  _threads.set(key, next);
  _trimTenant(_threads, tenantId);
  return next;
}

function getThreadContext(tenantId, threadId) {
  return _threads.get(`${_tenantKey(tenantId)}:${threadId}`) || null;
}

function saveWorkflow(tenantId, workflow) {
  const id = workflow.id || uuidv4();
  const key = `${_tenantKey(tenantId)}:${id}`;
  const row = { ...workflow, id, tenant_id: tenantId, updated_at: new Date().toISOString() };
  _workflows.set(key, row);
  _trimTenant(_workflows, tenantId);
  return row;
}

function listWorkflows(tenantId, threadId = null) {
  const prefix = `${_tenantKey(tenantId)}:`;
  return [..._workflows.values()]
    .filter((w) => String(w.tenant_id) === String(tenantId))
    .filter((w) => !threadId || w.thread_id === threadId);
}

function saveTask(tenantId, task) {
  const id = task.id || uuidv4();
  const key = `${_tenantKey(tenantId)}:${id}`;
  const row = { ...task, id, tenant_id: tenantId, updated_at: new Date().toISOString() };
  _tasks.set(key, row);
  _trimTenant(_tasks, tenantId);
  return row;
}

function listTasks(tenantId, threadId = null) {
  return [..._tasks.values()]
    .filter((t) => String(t.tenant_id) === String(tenantId))
    .filter((t) => !threadId || t.thread_id === threadId);
}

function saveReminder(tenantId, reminder) {
  const id = reminder.id || uuidv4();
  const key = `${_tenantKey(tenantId)}:${id}`;
  const row = { ...reminder, id, tenant_id: tenantId, updated_at: new Date().toISOString() };
  _reminders.set(key, row);
  _trimTenant(_reminders, tenantId);
  return row;
}

function listReminders(tenantId, threadId = null) {
  return [..._reminders.values()]
    .filter((r) => String(r.tenant_id) === String(tenantId))
    .filter((r) => !threadId || r.thread_id === threadId);
}

function recentEvents(tenantId, limit = 30) {
  return _events
    .filter((e) => !tenantId || e.tenant_id === tenantId)
    .slice(-limit);
}

function clearTenant(tenantId) {
  const tk = _tenantKey(tenantId);
  for (const store of [_workflows, _tasks, _reminders, _threads]) {
    for (const k of [...store.keys()]) {
      if (k.startsWith(`${tk}:`)) store.delete(k);
    }
  }
}

module.exports = {
  recordEvent,
  bumpMetric,
  getMetrics,
  consumeObservationBudget,
  upsertThreadContext,
  getThreadContext,
  saveWorkflow,
  listWorkflows,
  saveTask,
  listTasks,
  saveReminder,
  listReminders,
  recentEvents,
  clearTenant
};
