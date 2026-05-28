'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultVal = 'shadow') {
  const v = String(process.env[name] || defaultVal).trim().toLowerCase();
  if (['off', 'shadow', 'audit', 'on'].includes(v)) return v;
  return defaultVal;
}

module.exports = {
  isRlsEnabled: () => _flag('IMPETUS_RLS_ENABLED', false),
  rlsMode: () => _mode('IMPETUS_RLS_MODE', 'shadow'),
  rlsPilotOnly: () => {
    const v = process.env.IMPETUS_RLS_PILOT_ONLY;
    if (v == null || v === '') return true;
    return v === 'on' || v === 'true' || v === '1';
  },
  rlsPilotTenants: () => {
    const raw = process.env.IMPETUS_RLS_PILOT_TENANTS || process.env.IMPETUS_MFA_PILOT_TENANTS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  },
  fuzzEnabled: () => _flag('IMPETUS_TENANT_FUZZ_ENABLED', true),
  chaosEnabled: () => _flag('IMPETUS_TENANT_CHAOS_ENABLED', true),
  invariants: Object.freeze({
    additive_only: true,
    application_queries_preserved: true,
    bypass_for_migrations: true,
    rollback_safe: true,
    zero_leakage_goal: true,
  }),
};
