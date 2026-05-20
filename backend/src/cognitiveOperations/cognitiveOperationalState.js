'use strict';

const _state = { lifecycle: 'observe', last_health: null, pressure_samples: [] };

function getCognitiveOperationalState() {
  return { ..._state, updated_at: new Date().toISOString() };
}

function updateOperationalState(patch = {}) {
  Object.assign(_state, patch);
  if (patch.pressure != null) {
    _state.pressure_samples.push({ v: patch.pressure, ts: Date.now() });
    if (_state.pressure_samples.length > 100) _state.pressure_samples.shift();
  }
  return getCognitiveOperationalState();
}

function resetOperationalState() {
  _state.lifecycle = 'observe';
  _state.last_health = null;
  _state.pressure_samples = [];
}

module.exports = { getCognitiveOperationalState, updateOperationalState, resetOperationalState };
