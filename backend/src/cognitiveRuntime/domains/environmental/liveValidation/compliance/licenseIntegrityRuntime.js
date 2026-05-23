'use strict';

function validateLicenseIntegrity(signalBundle = {}) {
  const licenses = signalBundle.raw?.licenses || [];
  return {
    integrity_ok: licenses.every((l) => l.id && l.name),
    expired_count: licenses.filter((l) => l.days_to_expire != null && l.days_to_expire < 0).length,
    critical_expiring: licenses.filter((l) => l.days_to_expire != null && l.days_to_expire <= 30).length
  };
}

module.exports = { validateLicenseIntegrity };
