'use strict';

/**
 * APPSEC-01 — Enterprise Runtime Configuration Validator
 * Boot fail em produção para flags/configurações inseguras.
 */

const flags = require('./config/appsecFlags');
const { validateSecretsOrThrow } = require('./secretManagement');

const AUDIT_EVENT = 'APPSEC_RUNTIME_CONFIG';

function auditConfig(event, meta) {
  try {
    console.info(`[${AUDIT_EVENT}]`, JSON.stringify({ event, at: new Date().toISOString(), ...meta }));
  } catch (_) { /* never break */ }
}

/**
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
function validateRuntimeConfiguration() {
  const errors = [];
  const warnings = [];
  const isProd = flags.isProduction();

  if (isProd) {
    if (/^(0|false|no)$/i.test(String(process.env.LICENSE_VALIDATION_ENABLED || '').trim())) {
      errors.push('LICENSE_VALIDATION_ENABLED=false em produção');
    }
    if (/^(1|true|yes)$/i.test(String(process.env.ADMIN_PORTAL_DEBUG_INVITE_LINK || '').trim())) {
      errors.push('ADMIN_PORTAL_DEBUG_INVITE_LINK=true em produção');
    }
    if (/^(1|true|yes)$/i.test(String(process.env.IMPETUS_ALLOW_TOKEN_IN_QUERY || '').trim())) {
      errors.push('IMPETUS_ALLOW_TOKEN_IN_QUERY=true em produção');
    }
    if (/^(1|true|yes)$/i.test(String(process.env.IMPETUS_INTERNAL_NETWORK_DEV_BYPASS || '').trim())) {
      errors.push('IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=true em produção');
    }
  } else {
    if (process.env.LICENSE_VALIDATION_ENABLED === 'false') {
      warnings.push('LICENSE_VALIDATION_ENABLED=false (dev/staging)');
    }
  }

  auditConfig('VALIDATE', { ok: errors.length === 0, errors, warnings });
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validação completa APPSEC-01 no boot (aditiva a configValidator existente).
 */
function validateAppsecBootOrThrow(options = {}) {
  if (!flags.isRuntimeConfigValidatorEnabled()) {
    return { ok: true, skipped: true };
  }
  const allowPartial = /^(1|true|yes)$/i.test(String(process.env.ALLOW_PARTIAL_ENV || '').trim());
  if (allowPartial) {
    return { ok: true, skipped: true, reason: 'ALLOW_PARTIAL_ENV' };
  }

  const runtime = validateRuntimeConfiguration();
  const secrets = validateSecretsOrThrow(options);

  const errors = [...runtime.errors, ...(secrets.errors || [])];
  if (flags.isProduction() && errors.length) {
    auditConfig('BOOT_FAIL', { errors });
    const err = new Error(
      'APPSEC-01 Runtime Configuration: boot bloqueado em produção.\n' +
      errors.map((e) => `  - ${e}`).join('\n')
    );
    err.name = 'AppsecRuntimeConfigError';
    throw err;
  }

  const warnings = [...runtime.warnings, ...(secrets.warnings || [])];
  if (warnings.length) {
    console.warn('[APPSEC_RUNTIME_CONFIG] Avisos:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
  }

  return { ok: true, runtime, secrets, warnings };
}

module.exports = {
  AUDIT_EVENT,
  validateRuntimeConfiguration,
  validateAppsecBootOrThrow
};
