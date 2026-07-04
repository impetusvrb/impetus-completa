'use strict';

/**
 * SEC-20 — Enterprise Security v2 Certification flags (OFF por defeito).
 */

function envBool(key, defaultValue = false) {
  const v = process.env[key];
  if (v === undefined || v === null || v === '') return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function isSecurityCertificationV2Enabled() {
  return envBool('SECURITY_CERTIFICATION_V2', false);
}

module.exports = { isSecurityCertificationV2Enabled };
