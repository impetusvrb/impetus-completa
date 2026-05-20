'use strict';

/**
 * Sequência obrigatória de activação — KPI → summary → chat → boundary.
 */

const ROLLOUT_SEQUENCE = ['kpi', 'summary', 'chat', 'boundary'];

const _sequenceState = {
  current_step: 0,
  completed: [],
  last_promoted_at: null
};

function getSequenceState() {
  return {
    sequence: ROLLOUT_SEQUENCE,
    current_step: _sequenceState.current_step,
    next_channel: ROLLOUT_SEQUENCE[_sequenceState.current_step] || null,
    completed: [..._sequenceState.completed],
    last_promoted_at: _sequenceState.last_promoted_at,
    all_complete: _sequenceState.current_step >= ROLLOUT_SEQUENCE.length
  };
}

function canPromoteChannel(channel, ctx = {}) {
  const idx = ROLLOUT_SEQUENCE.indexOf(channel);
  if (idx < 0) return { allowed: false, reason: 'not_in_rollout_sequence' };

  if (ctx.skip_sequence === true && ctx.approved_by) {
    return { allowed: true, reason: 'sequence_override_approved', step: idx };
  }

  const expected = ROLLOUT_SEQUENCE[_sequenceState.current_step];
  if (channel !== expected) {
    return {
      allowed: false,
      reason: 'sequence_order_violation',
      expected_next: expected,
      requested: channel
    };
  }
  return { allowed: true, reason: 'sequence_ok', step: idx };
}

function recordChannelPromoted(channel) {
  const idx = ROLLOUT_SEQUENCE.indexOf(channel);
  if (idx < 0) return { recorded: false };
  if (!_sequenceState.completed.includes(channel)) {
    _sequenceState.completed.push(channel);
  }
  if (idx >= _sequenceState.current_step) {
    _sequenceState.current_step = idx + 1;
  }
  _sequenceState.last_promoted_at = new Date().toISOString();
  return { recorded: true, state: getSequenceState() };
}

function resetSequenceForTests() {
  _sequenceState.current_step = 0;
  _sequenceState.completed.length = 0;
  _sequenceState.last_promoted_at = null;
}

module.exports = {
  ROLLOUT_SEQUENCE,
  getSequenceState,
  canPromoteChannel,
  recordChannelPromoted,
  resetSequenceForTests
};
