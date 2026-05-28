'use strict';

/**
 * Registo declarativo BPMN-like (JSON) — sem parser XML externo (aditivo).
 */

const APPROVAL_CHAIN_V1 = Object.freeze({
  process_key: 'governance.approval_chain.v1',
  version: 1,
  bpmn: {
    startEvent: 'start',
    endEvents: ['end_completed', 'end_rejected', 'end_compensated'],
    nodes: {
      start: { type: 'start', next: 'supervisor_gate' },
      supervisor_gate: {
        type: 'userTask',
        name: 'Supervisor approval',
        approval: { minHierarchy: 4 },
        on: { approved: 'execute_task', rejected: 'end_rejected' }
      },
      execute_task: { type: 'serviceTask', handler: 'noop_execute', next: 'end_completed' },
      compensate: { type: 'serviceTask', handler: 'compensate', next: 'end_compensated' },
      end_completed: { type: 'end' },
      end_rejected: { type: 'end' },
      end_compensated: { type: 'end' }
    }
  },
  state_machine: {
    initial: 'created',
    terminal: ['completed', 'rejected', 'compensated', 'failed'],
    transitions: [
      { from: 'created', event: 'SUBMIT', to: 'pending_approval', deterministic: true },
      { from: 'pending_approval', event: 'APPROVE', to: 'approved', deterministic: true },
      { from: 'pending_approval', event: 'REJECT', to: 'rejected', deterministic: true },
      { from: 'approved', event: 'EXECUTE', to: 'executing', deterministic: true },
      { from: 'executing', event: 'COMPLETE', to: 'completed', deterministic: true },
      { from: 'executing', event: 'FAIL', to: 'failed', deterministic: true },
      { from: 'approved', event: 'COMPENSATE', to: 'compensating', deterministic: true },
      { from: 'executing', event: 'COMPENSATE', to: 'compensating', deterministic: true },
      { from: 'compensating', event: 'COMPENSATION_DONE', to: 'compensated', deterministic: true }
    ]
  },
  compensation_handlers: ['rollback_context']
});

const TASK_LIFECYCLE_V1 = Object.freeze({
  process_key: 'operational.task_lifecycle.v1',
  version: 1,
  bpmn: {
    startEvent: 'start',
    endEvents: ['end_done', 'end_cancelled'],
    nodes: {
      start: { type: 'start', next: 'open' },
      open: { type: 'task', next: { assign: 'assigned', cancel: 'end_cancelled' } },
      assigned: { type: 'task', next: { complete: 'end_done', cancel: 'end_cancelled' } },
      end_done: { type: 'end' },
      end_cancelled: { type: 'end' }
    }
  },
  state_machine: {
    initial: 'open',
    terminal: ['done', 'cancelled'],
    transitions: [
      { from: 'open', event: 'ASSIGN', to: 'assigned', deterministic: true },
      { from: 'open', event: 'CANCEL', to: 'cancelled', deterministic: true },
      { from: 'assigned', event: 'COMPLETE', to: 'done', deterministic: true },
      { from: 'assigned', event: 'CANCEL', to: 'cancelled', deterministic: true }
    ]
  },
  compensation_handlers: []
});

const BUILTIN = Object.freeze([APPROVAL_CHAIN_V1, TASK_LIFECYCLE_V1]);

const _byKey = new Map(BUILTIN.map((d) => [`${d.process_key}@${d.version}`, d]));

function getDefinition(processKey, version = 1) {
  return _byKey.get(`${processKey}@${version}`) || null;
}

function listDefinitions() {
  return BUILTIN.map((d) => ({
    process_key: d.process_key,
    version: d.version,
    states: d.state_machine.transitions?.length || 0
  }));
}

function validateTransition(definition, fromState, event) {
  const sm = definition?.state_machine;
  if (!sm) return { ok: false, reason: 'no_state_machine' };
  const match = (sm.transitions || []).filter((t) => t.from === fromState && t.event === event);
  if (match.length === 0) return { ok: false, reason: 'invalid_transition' };
  if (match.length > 1) return { ok: false, reason: 'non_deterministic_transition' };
  if (match[0].deterministic !== true) return { ok: false, reason: 'transition_not_marked_deterministic' };
  return { ok: true, transition: match[0] };
}

module.exports = {
  APPROVAL_CHAIN_V1,
  TASK_LIFECYCLE_V1,
  getDefinition,
  listDefinitions,
  validateTransition
};
