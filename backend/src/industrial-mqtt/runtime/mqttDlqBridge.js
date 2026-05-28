'use strict';

async function moveFailedMessage(companyId, topic, payload, reason) {
  const envelope = {
    event_name: 'mqtt.message.processing_failed',
    domain: 'environment',
    company_id: companyId,
    payload: {
      topic,
      sample: payload,
      industrial_event_name: 'mqtt.message.processing_failed',
    },
    metadata: { source: 'mqtt_real_runtime' },
  };

  try {
    const dlq = require('../../eventPipeline/dlq/industrialDlqService');
    return await dlq.moveToDlq(envelope, {
      reason: reason || 'processing_failed',
      source: 'mqtt_real',
    });
  } catch (err) {
    console.warn('[MQTT_DLQ]', err?.message);
    return { ok: false, error: err?.message };
  }
}

module.exports = { moveFailedMessage };
