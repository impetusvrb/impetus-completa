'use strict';

function validateAuditIntegrity(signalBundle = {}) {
  const op = signalBundle.operational || {};
  return {
    audits_open: op.audit_open ?? 0,
    audit_critical: (op.audit_open ?? 0) > 2,
    integrity_ok: (op.audit_open ?? 0) <= 2
  };
}

module.exports = { validateAuditIntegrity };
