'use strict';

const assert = require('assert');

function purge() {
  for (const m of [
    '../services/confidenceCalibrationService',
    '../services/cognitiveDbPersistenceService',
    '../services/aiAnalyticsService'
  ]) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (_e) {}
  }
}

async function main() {
  const env = { ...process.env };
  try {
    purge();
    process.env.IMPETUS_CONFIDENCE_CALIBRATION_ENABLED = 'true';
    const cal = require('../services/confidenceCalibrationService');

    assert.strictEqual(cal.isConfidenceCalibrationEnabled(), true);

    assert.strictEqual(
      cal.detectOverconfidence({ confidence: 92, consensusScore: 41, driftDetected: true }),
      true
    );

    assert.strictEqual(
      cal.detectUnderconfidence({ confidence: 35, consensusScore: 85, driftDetected: false }),
      true
    );

    const calScore = cal.calculateCalibratedConfidence({
      confidence: 92,
      consensusScore: 41,
      driftDetected: true
    });
    assert.strictEqual(calScore, 32);

    const noDrift = cal.calculateCalibratedConfidence({
      confidence: 50,
      consensusScore: 80,
      driftDetected: false
    });
    assert.strictEqual(noDrift, 40);

    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc = require('../services/cognitiveDbPersistenceService');
    await dbSvc.persistCalibrationEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      calibrated_confidence: 55,
      overconfidence: false,
      underconfidence: false,
      payload: { smoke: true }
    });

    process.env.IMPETUS_CONFIDENCE_CALIBRATION_ENABLED = 'false';
    purge();
    const calOff = require('../services/confidenceCalibrationService');
    assert.strictEqual(calOff.isConfidenceCalibrationEnabled(), false);
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc2 = require('../services/cognitiveDbPersistenceService');
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
    await dbSvc2.persistCalibrationEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      calibrated_confidence: 90,
      overconfidence: true,
      underconfidence: false,
      payload: { should_skip_when_disabled: true }
    });

    console.log('[CONFIDENCE_CALIBRATION_SMOKE]', 'ok');
  } finally {
    for (const k of Object.keys(env)) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    purge();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
