'use strict';

const assert = require('assert');

function purge() {
  for (const m of [
    '../services/cognitiveStabilityService',
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
    process.env.IMPETUS_CSI_ENABLED = 'true';
    const csi = require('../services/cognitiveStabilityService');

    assert.strictEqual(csi.isCsiEnabled(), true);

    const high = csi.calculateCognitiveStabilityIndex({
      consensusScore: 90,
      recentDriftEvents: 0,
      overconfidenceEvents: 0,
      underconfidenceEvents: 0,
      rollbackCount: 0
    });
    assert.strictEqual(csi.classifyCsiStatus(high.csi), 'stable');
    assert.ok(high.csi >= 85);

    const mid = csi.calculateCognitiveStabilityIndex({
      consensusScore: 55,
      recentDriftEvents: 1,
      overconfidenceEvents: 0,
      underconfidenceEvents: 0,
      rollbackCount: 0
    });
    assert.strictEqual(csi.classifyCsiStatus(mid.csi), 'warning');

    const low = csi.calculateCognitiveStabilityIndex({
      consensusScore: 40,
      recentDriftEvents: 8,
      overconfidenceEvents: 3,
      underconfidenceEvents: 2,
      rollbackCount: 2
    });
    assert.strictEqual(csi.classifyCsiStatus(low.csi), 'critical');

    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc = require('../services/cognitiveDbPersistenceService');
    await dbSvc.persistCsiEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      csi: 72,
      status: 'warning',
      payload: { smoke: true }
    });

    const rollHeavy = csi.calculateCognitiveStabilityIndex({
      consensusScore: 100,
      recentDriftEvents: 0,
      overconfidenceEvents: 0,
      underconfidenceEvents: 0,
      rollbackCount: 5
    });
    const noRoll = csi.calculateCognitiveStabilityIndex({
      consensusScore: 100,
      recentDriftEvents: 0,
      overconfidenceEvents: 0,
      underconfidenceEvents: 0,
      rollbackCount: 0
    });
    assert.ok(rollHeavy.csi < noRoll.csi, 'rollbacks devem reduzir CSI');

    process.env.IMPETUS_CSI_ENABLED = 'false';
    purge();
    const csiOff = require('../services/cognitiveStabilityService');
    assert.strictEqual(csiOff.isCsiEnabled(), false);
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvc2 = require('../services/cognitiveDbPersistenceService');
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
    await dbSvc2.persistCsiEventToDb({
      companyId: '00000000-0000-4000-8000-000000000099',
      csi: 99,
      status: 'stable',
      payload: { skip: true }
    });

    console.log('[COGNITIVE_STABILITY_SMOKE]', 'ok');
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
