'use strict';

/**
 * SEC-10 — Enterprise Active Defense flags.
 * Default OFF — consultative only, zero destructive actions.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isSecurityActiveDefenseEnabled() {
  return envBool('SECURITY_ACTIVE_DEFENSE', false);
}

/** observe | recommend — nunca execute ou protect automático. */
function activeDefenseMode() {
  const raw = String(process.env.SECURITY_ACTIVE_DEFENSE_MODE || 'observe').toLowerCase();
  if (['observe', 'recommend'].includes(raw)) return raw;
  return 'observe';
}

/** Nível máximo de recomendação (0–2). SEC-11+ para acções adaptativas. */
function maxDefenseLevel() {
  return envInt('SECURITY_ACTIVE_DEFENSE_MAX_LEVEL', 2, 0, 2);
}

function evaluationIntervalMs() {
  return envInt('SECURITY_ACTIVE_DEFENSE_EVAL_MS', 60000, 15000, 300000);
}

function operatorRecipients() {
  const raw = process.env.SECURITY_ACTIVE_DEFENSE_OPERATORS || 'Wellington,Gustavo';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = {
  envBool,
  envInt,
  isSecurityActiveDefenseEnabled,
  activeDefenseMode,
  maxDefenseLevel,
  evaluationIntervalMs,
  operatorRecipients
};
