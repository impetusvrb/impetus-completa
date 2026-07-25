'use strict';

/**
 * INC-048 — Feature flag de convergência (default false).
 */

function _flag(name, defaultValue = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function isInc048Enabled() {
  return _flag('IMPETUS_INC048_ENABLED', false);
}

function snapshot() {
  return Object.freeze({
    inc048_enabled: isInc048Enabled(),
    phase: 'INC-048',
    status: isInc048Enabled() ? 'CONVERGENCE_ACTIVE' : 'CONVERGENCE_DISABLED'
  });
}

module.exports = {
  isInc048Enabled,
  snapshot,
  _flag
};
