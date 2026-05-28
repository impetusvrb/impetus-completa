'use strict';

/**
 * PROMPT 29 — Rollout Center flags (painel unificado, read-first).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envMode(name, allowed, defaultValue) {
  const v = String(process.env[name] || defaultValue).trim().toLowerCase();
  return allowed.includes(v) ? v : defaultValue;
}

function rolloutCenterMode() {
  return envMode('IMPETUS_ROLLOUT_CENTER_MODE', ['off', 'shadow', 'audit', 'on'], 'on');
}

function isRolloutCenterActive() {
  return rolloutCenterMode() !== 'off' || envBool('IMPETUS_ROLLOUT_CENTER_ENABLED', true);
}

function shouldPersistAudit() {
  const m = rolloutCenterMode();
  return m === 'audit' || m === 'on';
}

function allowsPromotionSimulation() {
  return rolloutCenterMode() === 'on';
}

module.exports = {
  rolloutCenterMode,
  isRolloutCenterActive,
  shouldPersistAudit,
  allowsPromotionSimulation,
  envBool
};
