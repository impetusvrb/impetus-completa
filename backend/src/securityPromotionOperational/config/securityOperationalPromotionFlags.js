'use strict';

/**
 * SEC-13A — Flags promoção operacional.
 * Default OFF — não activa módulos automaticamente.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isSecurityOperationalPromotionEnabled() {
  return envBool('SECURITY_OPERATIONAL_PROMOTION', false);
}

function promotionMode() {
  const raw = String(process.env.SECURITY_PROMOTION_MODE || 'controlled').toLowerCase();
  if (['controlled', 'observe'].includes(raw)) return raw;
  return 'controlled';
}

function validateOnEval() {
  return envBool('SECURITY_PROMOTION_VALIDATE', true);
}

function evalIntervalMs() {
  const n = Number(process.env.SECURITY_OPERATIONAL_PROMOTION_EVAL_MS);
  if (!Number.isFinite(n)) return 120000;
  return Math.min(600000, Math.max(30000, Math.floor(n)));
}

module.exports = {
  envBool,
  isSecurityOperationalPromotionEnabled,
  promotionMode,
  validateOnEval,
  evalIntervalMs
};
