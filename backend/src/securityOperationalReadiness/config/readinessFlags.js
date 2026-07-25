'use strict';

/**
 * APPSEC-02A — Feature flags (operacional; não altera APPSEC-01/02).
 */

function envBool(name, defaultValue = true) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function isProduction() {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

module.exports = {
  envBool,
  isProduction,
  isOperationalReadinessEnabled: () => envBool('IMPETUS_APPSEC_02A_ENABLED', true)
};
