'use strict';

/**
 * @param {object} e
 */
function makePublicationAuditEntry(e) {
  return {
    ts: new Date().toISOString(),
    domain: e.domain || 'unknown',
    actor: e.actor || null,
    tenant: e.tenant || null,
    event: e.event || 'publication',
    visibility_reason: e.visibility_reason || null,
    denied_reason: e.denied_reason || null,
    audience: e.audience || null,
    rollout: e.rollout || null,
    meta: e.meta && typeof e.meta === 'object' ? e.meta : {}
  };
}

module.exports = { makePublicationAuditEntry };
