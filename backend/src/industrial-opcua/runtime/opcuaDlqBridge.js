'use strict';

async function moveFailedSample(companyId, nodeId, payload, reason) {
  const envelope = {
    event_name: 'opcua.sample.processing_failed',
    domain: 'environment',
    company_id: companyId,
    payload: {
      node_id: nodeId,
      sample: payload,
      industrial_event_name: 'opcua.sample.processing_failed',
    },
    metadata: { source: 'opcua_real_runtime' },
  };

  try {
    const dlq = require('../../eventPipeline/dlq/industrialDlqService');
    return await dlq.moveToDlq(envelope, {
      reason: reason || 'processing_failed',
      source: 'opcua_real',
    });
  } catch (err) {
    console.warn('[OPCUA_DLQ]', err?.message);
    return { ok: false, error: err?.message };
  }
}

module.exports = { moveFailedSample };
