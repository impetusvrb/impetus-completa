'use strict';

/**
 * WAVE 4 — governação de tokens por tenant (janela 24h, in-memory).
 */

const flags = require('./cognitiveBudgetFlags');

const _usage = new Map(); // company_id -> { tokens, windowStart }
const WINDOW_MS = 86400000;

function _windowKey(companyId) {
  return String(companyId);
}

function _resetIfExpired(entry) {
  if (!entry) return { tokens: 0, windowStart: Date.now() };
  if (Date.now() - entry.windowStart >= WINDOW_MS) {
    return { tokens: 0, windowStart: Date.now() };
  }
  return entry;
}

function getTenantUsage(companyId) {
  const key = _windowKey(companyId);
  const entry = _resetIfExpired(_usage.get(key));
  _usage.set(key, entry);
  return entry.tokens;
}

function getTenantRemainingTokens(companyId) {
  if (!flags.isContextBudgetEnabled()) return null;
  const quota = flags.tenantTokenQuotaPer24h();
  const used = getTenantUsage(companyId);
  return Math.max(0, quota - used);
}

/**
 * @param {string} companyId
 * @param {number} tokens
 * @param {{ dry_run?: boolean }} [opts]
 */
function recordTenantUsage(companyId, tokens, opts = {}) {
  if (!flags.isContextBudgetEnabled()) return { allowed: true, recorded: false };

  const quota = flags.tenantTokenQuotaPer24h();
  const key = _windowKey(companyId);
  const entry = _resetIfExpired(_usage.get(key) || { tokens: 0, windowStart: Date.now() });
  const next = entry.tokens + Math.max(0, Number(tokens) || 0);
  const allowed = next <= quota;

  if (!opts.dry_run && allowed) {
    entry.tokens = next;
    _usage.set(key, entry);
  }

  return {
    allowed,
    recorded: !opts.dry_run && allowed,
    used: entry.tokens,
    quota,
    remaining: Math.max(0, quota - entry.tokens)
  };
}

function getGovernanceSnapshot() {
  return {
    quota_per_24h: flags.tenantTokenQuotaPer24h(),
    enforce: flags.isTokenGovernanceEnforce(),
    active_tenants: _usage.size
  };
}

module.exports = {
  getTenantUsage,
  getTenantRemainingTokens,
  recordTenantUsage,
  getGovernanceSnapshot
};
