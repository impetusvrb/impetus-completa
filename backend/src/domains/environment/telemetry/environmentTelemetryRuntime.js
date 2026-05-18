'use strict';

const flags = require('./environmentTelemetryRuntimeFlags');
const isolation = require('./environmentTelemetryIsolationRuntime');
const realtime = require('./environmentRealtimeIngestionRuntime');
const edge = require('./environmentEdgeTelemetryRuntime');
const ingest = require('./environmentTelemetryIngestService');
const mqtt = require('./connectors/environmentMqttConnector');
const opcua = require('./connectors/environmentOpcUaConnector');
const modbus = require('./connectors/environmentModbusConnector');
const plc = require('./connectors/environmentPlcAdapterRuntime');

function getFoundationSnapshot() {
  return {
    runtime: flags.getTelemetryRuntimeFlagSnapshot(),
    isolation: isolation.getIsolationSnapshot(),
    realtime: realtime.getRealtimeIngestionSnapshot(),
    connectors: {
      mqtt: mqtt.getMqttState(),
      opcua: opcua.getOpcUaState(),
      modbus: modbus.getModbusState()
    },
    plc_vendors: [...plc.vendors]
  };
}

async function processConnectorIngest(companyId, userId, connector, payload) {
  let sampleBody = null;
  if (connector === 'mqtt') {
    const r = mqtt.ingestMqttMessage(companyId, payload.topic, payload.message || payload);
    if (!r.ok) return r;
    sampleBody = r.sampleBody;
  } else if (connector === 'opcua') {
    const r = opcua.ingestSubscriptionSample(
      companyId,
      payload.node_id,
      payload.value,
      payload.meta || {}
    );
    if (!r.ok) return r;
    sampleBody = r.sampleBody;
  } else if (connector === 'modbus') {
    const poll = await modbus.pollRegisters(companyId, payload.registers || [], payload.meta || {});
    if (!poll.ok) return poll;
    const results = [];
    for (const sb of poll.samples || []) {
      results.push(await ingest.ingestSingle(companyId, userId, sb));
    }
    return { ok: true, connector: 'modbus', results, latency_ms: poll.latency_ms };
  } else {
    return { ok: false, code: 'UNKNOWN_CONNECTOR' };
  }
  return ingest.ingestSingle(companyId, userId, sampleBody);
}

module.exports = {
  getFoundationSnapshot,
  processConnectorIngest,
  flags,
  edge,
  ingest,
  realtime
};
