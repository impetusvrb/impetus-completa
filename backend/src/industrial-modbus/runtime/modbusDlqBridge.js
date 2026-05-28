'use strict';

async function moveFailedSample(companyId, registerKey, payload, reason) {
  const envelope = {
    event_name: 'modbus.sample.processing_failed',
    domain: 'environment',
    company_id: companyId,
    payload: {
      register_key: registerKey,
      sample: payload,
      industrial_event_name: 'modbus.sample.processing_failed',
    },
    metadata: { source: 'modbus_real_runtime' },
  };

  try {
    const dlq = require('../../eventPipeline/dlq/industrialDlqService');
    return await dlq.moveToDlq(envelope, {
      reason: reason || 'processing_failed',
      source: 'modbus_real',
    });
  } catch (err) {
    console.warn('[MODBUS_DLQ]', err?.message);
    return { ok: false, error: err?.message };
  }
}

module.exports = { moveFailedSample };
