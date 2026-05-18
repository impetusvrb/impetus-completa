'use strict';

const TAGS = Object.freeze({
  RESOLVED: 'DOMAIN_AUTHORITY_RESOLVED',
  ISOLATION_BLOCKED: 'DOMAIN_ISOLATION_BLOCKED',
  CONFLICT: 'CONTEXTUAL_DOMAIN_CONFLICT',
  AXIS_INFERRED: 'FUNCTIONAL_AXIS_INFERRED',
  PIPELINE_DENIED: 'DOMAIN_PIPELINE_DENIED',
  MODULE_DENIED: 'DOMAIN_MODULE_DENIED'
});

function log(tag, payload) {
  try {
    console.log(tag, JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    /* never throw */
  }
}

module.exports = { TAGS, log };
