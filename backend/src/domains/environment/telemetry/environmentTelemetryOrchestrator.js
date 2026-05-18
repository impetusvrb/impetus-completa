'use strict';

const runtime = require('./environmentTelemetryRuntime');
const edge = require('./environmentEdgeTelemetryRuntime');
const ingest = require('./environmentTelemetryIngestService');
const flags = require('./environmentTelemetryRuntimeFlags');
const obs = require('./environmentTelemetryObservability');
const { publishEnvironmentIndustrialEvent } = require('../events/environmentEventPublisher');
const { v4: uuidv4 } = require('uuid');

async function orchestrateHealth() {
  const t0 = Date.now();
  const snap = runtime.getFoundationSnapshot();
  obs.record('environment_telemetry_runtime_ms', Date.now() - t0, { scope: 'health' });
  return { ok: true, shadow: true, ...snap };
}

async function orchestrateEdgeEnqueue(companyId, userId, payload) {
  return edge.enqueueEdgeSample(companyId, payload);
}

async function orchestrateEdgeSync(companyId, userId) {
  return edge.syncEdgeQueue(companyId, userId, ingest.ingestSingle);
}

async function orchestrateConnector(companyId, userId, connector, payload) {
  return runtime.processConnectorIngest(companyId, userId, connector, payload);
}

async function publishDeviceDisconnected(companyId, userId, deviceId, source) {
  if (!flags.isEnvironmentTelemetryBackboneEventsEnabled()) return null;
  return publishEnvironmentIndustrialEvent(
    {
      event_name: 'environment.telemetry.device_disconnected',
      company_id: companyId,
      correlation_id: uuidv4(),
      payload: { device_id: deviceId, source }
    },
    { origin_layer: 'operational', intended_audience: 'technician', user_id: userId }
  );
}

async function publishReconnectCompleted(companyId, userId, source) {
  if (!flags.isEnvironmentTelemetryBackboneEventsEnabled()) return null;
  return publishEnvironmentIndustrialEvent(
    {
      event_name: 'environment.telemetry.reconnect_completed',
      company_id: companyId,
      correlation_id: uuidv4(),
      payload: { source }
    },
    { origin_layer: 'operational', intended_audience: 'technician', user_id: userId }
  );
}

module.exports = {
  orchestrateHealth,
  orchestrateEdgeEnqueue,
  orchestrateEdgeSync,
  orchestrateConnector,
  publishDeviceDisconnected,
  publishReconnectCompleted
};
