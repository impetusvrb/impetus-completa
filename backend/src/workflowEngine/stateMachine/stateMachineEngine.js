'use strict';

const bpmnRegistry = require('../bpmn/bpmnDefinitionRegistry');

/**
 * Motor de state machine determinístico — uma transição válida por (from, event).
 */
function applyTransition(definition, currentState, event, ctx = {}) {
  const check = bpmnRegistry.validateTransition(definition, currentState, event);
  if (!check.ok) {
    return { ok: false, reason: check.reason, from: currentState, event };
  }

  const terminal = definition.state_machine.terminal || [];
  const toState = check.transition.to;
  const isTerminal = terminal.includes(toState);

  return {
    ok: true,
    from: currentState,
    to: toState,
    event,
    terminal: isTerminal,
    deterministic: true,
    transition_id: `${definition.process_key}:${currentState}:${event}:${toState}`,
    context_hash: _contextHash(ctx)
  };
}

function _contextHash(ctx) {
  try {
    const stable = JSON.stringify(ctx, Object.keys(ctx || {}).sort());
    let h = 0;
    for (let i = 0; i < stable.length; i++) h = (h * 31 + stable.charCodeAt(i)) >>> 0;
    return `ctx-${h.toString(16)}`;
  } catch (_e) {
    return 'ctx-0';
  }
}

function getInitialState(definition) {
  return definition?.state_machine?.initial || 'created';
}

function isTerminalState(definition, state) {
  return (definition?.state_machine?.terminal || []).includes(state);
}

module.exports = {
  applyTransition,
  getInitialState,
  isTerminalState
};
