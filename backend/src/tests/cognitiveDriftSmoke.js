'use strict';

const assert = require('assert');

function purgeDrift() {
  delete require.cache[require.resolve('../services/cognitiveDriftService')];
  delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
}

async function testConfidenceDrift() {
  const cognitiveDriftService = require('../services/cognitiveDriftService');
  const d = await cognitiveDriftService.detectConfidenceDrift({
    baselineConfidence: 0.4,
    currentConfidence: 0.6
  });
  assert.strictEqual(d.drift_detected, true);
  assert.ok(Math.abs(d.delta - 50) < 1e-6);
}

function testNarrativeDrift() {
  const cognitiveDriftService = require('../services/cognitiveDriftService');
  const hit = cognitiveDriftService.detectNarrativeDrift({
    previousNarrative: 'operação normal',
    currentNarrative: 'Houve produção interrompida na linha'
  });
  assert.strictEqual(hit, true);
  const no = cognitiveDriftService.detectNarrativeDrift({
    previousNarrative: 'produção interrompida',
    currentNarrative: 'produção interrompida ainda'
  });
  assert.strictEqual(no, false);
}

function testKillSwitchSchedule() {
  const prev = process.env.IMPETUS_COGNITIVE_DRIFT_ENABLED;
  process.env.IMPETUS_COGNITIVE_DRIFT_ENABLED = 'false';
  purgeDrift();
  const cognitiveDriftService = require('../services/cognitiveDriftService');
  assert.strictEqual(cognitiveDriftService.isDriftDetectionEnabled(), false);
  cognitiveDriftService.schedulePersistDriftReport(
    '00000000-0000-4000-8000-000000000001',
    {
      confidence: { drift_detected: true, delta: 99 },
      data_state: { production_active_changed: false },
      narrative: { drift_detected: false }
    },
    '00000000-0000-4000-8000-000000000002'
  );
  if (prev === undefined) delete process.env.IMPETUS_COGNITIVE_DRIFT_ENABLED;
  else process.env.IMPETUS_COGNITIVE_DRIFT_ENABLED = prev;
  purgeDrift();
}

async function testPersistNoThrow() {
  const prevDb = process.env.IMPETUS_COGNITIVE_DB_ENABLED;
  process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
  purgeDrift();
  const cognitiveDbPersistence = require('../services/cognitiveDbPersistenceService');
  await cognitiveDbPersistence.persistDriftEventToDb({
    companyId: '00000000-0000-4000-8000-000000000001',
    drift_type: 'smoke',
    severity: 'info',
    payload: { test: true }
  });
  if (prevDb === undefined) delete process.env.IMPETUS_COGNITIVE_DB_ENABLED;
  else process.env.IMPETUS_COGNITIVE_DB_ENABLED = prevDb;
  purgeDrift();
}

async function main() {
  await testConfidenceDrift();
  testNarrativeDrift();
  testKillSwitchSchedule();
  await testPersistNoThrow();
  console.log('[COGNITIVE_DRIFT_SMOKE]', 'ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
