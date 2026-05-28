'use strict';

/**
 * Router de compatibilidade — observa uso legado, fallback seguro, sem remoção.
 */

const flags = require('../config/deprecationGovernanceFlags');
const registry = require('./legacyDeprecationRegistry');
const audit = require('../observability/deprecationAuditService');

const _usageCounters = new Map();

function _log(event, data) {
  try {
    console.info(
      '[LEGACY_DEPRECATION]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.deprecationMode(), ...data })
    );
  } catch (_e) {}
}

function recordLegacyInvocation(legacyId, ctx = {}) {
  if (!flags.isDeprecationGovernanceActive()) {
    return { recorded: false, reason: 'governance_inactive' };
  }

  const entry = registry.getEntry(legacyId);
  if (!entry) {
    _log('unknown_legacy', { legacy_id: legacyId });
    return { recorded: false, reason: 'unknown_legacy' };
  }

  const companyId = ctx.companyId || ctx.company_id || null;
  if (companyId && !flags.isPilotTenant(companyId)) {
    return { recorded: false, reason: 'tenant_not_pilot' };
  }

  const mode = flags.deprecationMode();
  const enforcement = registry.getEnforcementForEntry(entry, mode);
  const count = (_usageCounters.get(legacyId) || 0) + 1;
  _usageCounters.set(legacyId, count);

  const payload = {
    legacy_id: legacyId,
    enforcement,
    count,
    caller_hint: ctx.caller_hint || ctx.caller || null,
    replacement_id: entry.replacement_id,
    lifecycle: entry.lifecycle
  };

  _log('invocation', payload);

  if (flags.shouldPersistAudit()) {
    audit.recordAudit({
      companyId,
      legacyId,
      modulePath: entry.module_path,
      replacementId: entry.replacement_id,
      callerHint: payload.caller_hint,
      actorUserId: ctx.userId || ctx.actor_user_id || null,
      payload
    }).catch(() => {});
  }

  return {
    recorded: true,
    entry,
    enforcement,
    warn: enforcement === registry.ENFORCEMENT.WARN,
    redirect: enforcement === registry.ENFORCEMENT.REDIRECT,
    block: enforcement === registry.ENFORCEMENT.BLOCK && flags.allowsEnforcement(),
    replacement: entry.replacement_path,
    message: _buildMessage(entry, enforcement)
  };
}

function _buildMessage(entry, enforcement) {
  if (enforcement === registry.ENFORCEMENT.NONE) return null;
  return (
    `[Deprecation ${entry.debt_ref}] "${entry.id}" está ${entry.lifecycle}. ` +
    `Use ${entry.replacement_id}. Remoção não permitida até migração completa.`
  );
}

/**
 * Resolve módulo com fallback — nunca lança; nunca remove legado.
 */
function resolveWithFallback(legacyId, { legacyLoader, replacementLoader, ctx = {} } = {}) {
  const report = recordLegacyInvocation(legacyId, ctx);

  if (report.block && flags.allowsEnforcement()) {
    _log('block_prevented', { legacy_id: legacyId, note: 'BLOCK convertido em REDIRECT+WARN (additive)' });
  }

  if (
    report.redirect &&
    flags.allowsEnforcement() &&
    typeof replacementLoader === 'function'
  ) {
    try {
      const mod = replacementLoader();
      if (mod) {
        _log('redirected', { legacy_id: legacyId, to: report.entry?.replacement_id });
        return { module: mod, source: 'replacement', report };
      }
    } catch (err) {
      _log('redirect_failed', { legacy_id: legacyId, error: err?.message });
    }
  }

  if (typeof legacyLoader === 'function') {
    return { module: legacyLoader(), source: 'legacy_fallback', report };
  }

  return { module: null, source: 'none', report };
}

function getUsageSnapshot() {
  const entries = registry.listEntries();
  return entries.map((e) => ({
    legacy_id: e.id,
    debt_ref: e.debt_ref,
    lifecycle: e.lifecycle,
    invocations: _usageCounters.get(e.id) || 0,
    removal_allowed: e.removal_allowed === false ? false : e.removal_allowed
  }));
}

function getHealth() {
  return {
    mode: flags.deprecationMode(),
    active: flags.isDeprecationGovernanceActive(),
    pilot_tenants: flags.pilotTenants(),
    catalog_size: registry.LEGACY_ENTRIES.length,
    deprecated_count: registry.listEntries({ deprecated_only: true }).length,
    usage: getUsageSnapshot()
  };
}

module.exports = {
  recordLegacyInvocation,
  resolveWithFallback,
  getUsageSnapshot,
  getHealth
};
