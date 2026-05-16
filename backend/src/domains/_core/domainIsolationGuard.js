'use strict';

/**
 * WAVE 5 — isolamento cross-domain (validação programática; não altera require() Node).
 */

const { isDomainsV5Enabled, isDomainIsolationStrict } = require('./domainFlags');
const { isImportAllowed } = require('./dependencyRules');

const _violations = [];

/**
 * @param {{ fromDomain: string, toDomain: string, modulePath?: string, via?: string }} ctx
 */
function assertCrossDomainImport(ctx) {
  if (!isDomainsV5Enabled()) {
    return { allowed: true, enforced: false };
  }

  const check = isImportAllowed(ctx.fromDomain, ctx.toDomain, { via: ctx.via });
  if (!check.allowed) {
    const record = {
      ts: new Date().toISOString(),
      from: ctx.fromDomain,
      to: ctx.toDomain,
      module_path: ctx.modulePath || null,
      via: ctx.via || 'direct',
      reason: check.reason
    };
    _violations.push(record);
    if (_violations.length > 500) _violations.shift();

    try {
      console.warn('[DOMAIN_ISOLATION_VIOLATION]', JSON.stringify(record));
    } catch (_e) {}

    if (isDomainIsolationStrict()) {
      const e = new Error(`Cross-domain import forbidden: ${ctx.fromDomain} -> ${ctx.toDomain}`);
      e.code = 'DOMAIN_ISOLATION_VIOLATION';
      throw e;
    }
  }

  return { ...check, enforced: isDomainIsolationStrict() };
}

function getViolations(limit = 50) {
  return _violations.slice(-limit);
}

function wrapAclCall(fromDomain, toDomain, fn) {
  assertCrossDomainImport({ fromDomain, toDomain, via: 'acl' });
  return fn();
}

module.exports = {
  assertCrossDomainImport,
  getViolations,
  wrapAclCall
};
