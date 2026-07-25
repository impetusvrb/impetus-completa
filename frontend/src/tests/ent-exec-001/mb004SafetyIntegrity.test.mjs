import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../..');
const repository = path.resolve(frontend, '..');
const readFrontend = (relativePath) => fs.readFileSync(path.join(frontend, relativePath), 'utf8');

const telemetryHub = readFrontend('src/domains/safety/telemetry/SafetyTelemetryHub.jsx');
const cognitiveHub = readFrontend('src/domains/safety/cognitive/SafetyCognitiveHub.jsx');
const telemetryRoute = fs.readFileSync(
  path.join(repository, 'backend/src/routes/safetyTelemetry.js'),
  'utf8'
);

test('MB-004: Safety Telemetry não fabrica sensores, saúde ou alertas', () => {
  for (const syntheticTelemetry of [
    'Detector de gás H₂S — Área A',
    'Nível de ruído — Prensa 3',
    "status={sData?.status || 'online'}",
    'value={sData?.value ?? s.nominal}',
    "events_per_minute: 0",
    "queue_depth: 0",
    "wave3_enabled: true",
    "{ label: 'Críticos', value: '0'"
  ]) {
    assert.equal(telemetryHub.includes(syntheticTelemetry), false, syntheticTelemetry);
  }

  assert.match(telemetryHub, /Telemetria indisponível/);
  assert.match(telemetryHub, /Sensor não configurado ou sem dados disponíveis/);
});

test('MB-004: Safety Cognitive não envia sinais ou KPIs sintéticos', () => {
  for (const syntheticCognitiveState of [
    'buildSafetySignals',
    'incident_rates:',
    'near_miss_counts:',
    'hazard_exposure_index: 0.42',
    'compliance_rate: 0.87',
    "pack ? '87%'",
    "pack ? '42%'",
    "pack ? 'Crescente'"
  ]) {
    assert.equal(cognitiveHub.includes(syntheticCognitiveState), false, syntheticCognitiveState);
  }

  assert.match(cognitiveHub, /Fonte de sinais SST não configurada/);
  assert.match(cognitiveHub, /Estado SST não avaliado/);
});

test('MB-004: snapshot backend explicita fonte de telemetria não configurada', () => {
  assert.match(telemetryRoute, /status: 'not_configured'/);
  assert.match(telemetryRoute, /SAFETY_TELEMETRY_SOURCE_NOT_CONFIGURED/);
  assert.match(telemetryRoute, /navigation_samples: null/);
  assert.match(telemetryRoute, /publication_denied: null/);
  assert.doesNotMatch(
    telemetryRoute,
    /metrics:\s*\{\s*navigation_samples:\s*0,\s*publication_denied:\s*0\s*\}/
  );
});
