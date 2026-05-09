'use strict';

/**
 * Smoke — BD cognitiva paralela (kill switch, snapshot, falha segura sem Postgres).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cognitivePath = path.join(__dirname, '..', '..', 'storage', 'cognitive-memory.json');

function cleanupJson() {
  try {
    if (fs.existsSync(cognitivePath)) fs.unlinkSync(cognitivePath);
  } catch (_e) {}
}

function purgeStack() {
  for (const m of [
    '../services/aiAnalyticsService',
    '../services/autonomousOptimizationService',
    '../services/supervisedLearningService',
    '../services/learningMemoryService',
    '../services/cognitiveDbPersistenceService',
    '../services/cognitivePersistenceService'
  ]) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (_e) {}
  }
}

async function main() {
  const prev = { ...process.env };
  cleanupJson();
  try {
    process.env.IMPETUS_COGNITIVE_PERSISTENCE_ENABLED = 'true';
    process.env.LEARNING_MEMORY_STORE = 'true';
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    purgeStack();

    const learningMemory = require('../services/learningMemoryService');
    const dbSvc = require('../services/cognitiveDbPersistenceService');

    assert.strictEqual(dbSvc.isCognitiveDbEnabled(), false);
    learningMemory.storeInteraction({
      input: 'db-off',
      output: {},
      context: { module: 'smoke' },
      confidence: 0.2
    });
    const snapOff = await dbSvc.getCognitiveDbSnapshot();
    assert.strictEqual(snapOff.enabled, false);
    assert.strictEqual(snapOff.interactions, 0);

    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
    delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
    const dbSvcOn = require('../services/cognitiveDbPersistenceService');
    assert.strictEqual(dbSvcOn.isCognitiveDbEnabled(), true);
    const snapOn = await dbSvcOn.getCognitiveDbSnapshot();
    assert.strictEqual(snapOn.enabled, true);
    if (!snapOn.error) {
      assert.ok(typeof snapOn.interactions === 'number');
    }

    console.log('[COGNITIVE_DB_PERSISTENCE_SMOKE]', 'ok');
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
    cleanupJson();
    purgeStack();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
