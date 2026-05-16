'use strict';

/**
 * WAVE 5 — flags de bounded contexts (estrutural).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isDomainsV5Enabled() {
  return envBool('IMPETUS_DOMAINS_V5_ENABLED', false);
}

function isDomainIsolationStrict() {
  return isDomainsV5Enabled() && envBool('IMPETUS_DOMAIN_ISOLATION_STRICT', false);
}

module.exports = {
  isDomainsV5Enabled,
  isDomainIsolationStrict
};
