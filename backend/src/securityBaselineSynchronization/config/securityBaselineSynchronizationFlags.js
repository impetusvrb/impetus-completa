'use strict';

/**
 * SEC-21B — Baseline Synchronization flags (consultivo only).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityBaselineSynchronizationEnabled() {
  return envBool('SECURITY_BASELINE_SYNCHRONIZATION', false);
}

module.exports = {
  envBool,
  isSecurityBaselineSynchronizationEnabled
};
