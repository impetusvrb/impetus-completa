'use strict';

/**
 * Smoke — Environment Industrial Telemetry Runtime (sem subir Express).
 */

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

(async () => {
  console.log('\nENVIRONMENT TELEMETRY RUNTIME (backend)\n');

  const route = require('../../routes/environmentTelemetry');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const flags = require('../../domains/environment/telemetry/environmentTelemetryRuntimeFlags');
  ok('telemetry flags snapshot', typeof flags.getTelemetryRuntimeFlagSnapshot === 'function');

  const { evaluateExpectedRange, evaluateDrift, computeAnomalyScore } = require('../../domains/environment/telemetry/environmentTelemetryAnomalyGate');
  ok('range ok', evaluateExpectedRange(5, { min: 0, max: 10 }).breached === false);
  ok('range breach', evaluateExpectedRange(11, { min: 0, max: 10 }).breached === true);
  ok('drift', evaluateDrift(12, 10, 0.1).drifted === true);
  ok('anomaly score', computeAnomalyScore({ breached: true }, { drifted: false }) > 0);

  const { normalizeEnvironmentalSample } = require('../../domains/environment/telemetry/environmentTelemetryNormalization');
  const norm = normalizeEnvironmentalSample('00000000-0000-4000-8000-000000000001', {
    metric_key: 'water.flow',
    value: 1,
    environmental_area: 'water',
    telemetry_type: 'flow'
  });
  ok('normalization', norm.ok === true);

  const mqtt = require('../../domains/environment/telemetry/connectors/environmentMqttConnector');
  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_MQTT_ENABLED = 'true';
  const mqttRes = mqtt.ingestMqttMessage('00000000-0000-4000-8000-000000000001', 'plant/eta/flow', {
    value: 10,
    environmental_area: 'water'
  });
  ok('mqtt shadow ingest', mqttRes.ok === true && mqttRes.sampleBody != null);

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of [
    'environment.telemetry.sample_ingested',
    'environment.telemetry.edge_synced',
    'environment.telemetry.threshold_exceeded',
    'environment.telemetry.drift_detected',
    'environment.telemetry.anomaly_detected',
    'environment.telemetry.device_disconnected',
    'environment.telemetry.reconnect_completed',
    'environment.telemetry.normalization_failed'
  ]) {
    const v = validateCatalogType(t, { strict: true });
    ok(`catalog ${t}`, v.ok === true);
  }

  const validation = require('../../domains/environment/telemetry/validation/environmentTelemetryRuntimeValidation');
  const pack = validation.runFullTelemetryValidation();
  ok('validation pack', pack.runtime.ok === true);

  const contract = require('../../domains/environment/contracts/environmentDomainContract');
  ok('contract v3 telemetry api', contract.CONTRACT_VERSION === 3 && contract.TELEMETRY_API_PREFIX === '/api/environment-telemetry');

  const edge = require('../../domains/environment/telemetry/environmentEdgeTelemetryRuntime');
  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED = 'true';
  const enq = edge.enqueueEdgeSample('00000000-0000-4000-8000-000000000001', {
    metric_key: 'edge.test',
    value: 1,
    idempotency_key: 'idem-1'
  });
  ok('edge enqueue', enq.ok === true);

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
