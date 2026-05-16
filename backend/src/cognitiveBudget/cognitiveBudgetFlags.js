'use strict';

/**
 * WAVE 4 — flags de contexto cognitivo seguro.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envInt(name, defaultValue, min, max) {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isContextBudgetEnabled() {
  return envBool('IMPETUS_AI_CONTEXT_BUDGET_ENABLED', false);
}

function isSummarizerEnabled() {
  return isContextBudgetEnabled() && envBool('IMPETUS_AI_SUMMARIZER_ENABLED', false);
}

function isAutoloopGuardEnabled() {
  return envBool('IMPETUS_AI_AUTOLOOP_GUARD', true);
}

function isAutoloopGuardEnforce() {
  return isAutoloopGuardEnabled() && envBool('IMPETUS_AI_AUTOLOOP_GUARD_ENFORCE', false);
}

function tenantTokenQuotaPer24h() {
  return envInt('IMPETUS_AI_TOKEN_QUOTA_PER_TENANT', 500000, 10000, 50000000);
}

function autoloopMaxDepth() {
  return envInt('IMPETUS_AI_AUTOLOOP_MAX_DEPTH', 4, 2, 20);
}

function autoloopWindowMs() {
  return envInt('IMPETUS_AI_AUTOLOOP_WINDOW_MS', 60000, 5000, 300000);
}

function isSaturationProtectionEnabled() {
  return isContextBudgetEnabled() && envBool('IMPETUS_AI_SATURATION_PROTECTION_ENABLED', false);
}

function isTokenGovernanceEnforce() {
  return isContextBudgetEnabled() && envBool('IMPETUS_AI_TOKEN_GOVERNANCE_ENFORCE', false);
}

module.exports = {
  envBool,
  envInt,
  isContextBudgetEnabled,
  isSummarizerEnabled,
  isAutoloopGuardEnabled,
  isAutoloopGuardEnforce,
  tenantTokenQuotaPer24h,
  autoloopMaxDepth,
  autoloopWindowMs,
  isSaturationProtectionEnabled,
  isTokenGovernanceEnforce
};
