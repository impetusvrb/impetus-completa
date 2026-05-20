'use strict';

const { recordPrecisionAudit } = require('./runtimePrecisionAuditTrail');

function traceDelivery(artifactType, artifactId, decision, meta = {}) {
  const entry = {
    artifact_type: artifactType,
    artifact_id: artifactId,
    decision,
    ...meta
  };
  recordPrecisionAudit(entry);
  return entry;
}

module.exports = { traceDelivery };
