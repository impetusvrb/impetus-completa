'use strict';

/**
 * Smoke — persistência cognitiva (ficheiro, snapshot, kill switch).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cognitivePath = path.join(__dirname, '..', '..', 'storage', 'cognitive-memory.json');

function cleanupFile() {
  try {
    if (fs.existsSync(cognitivePath)) fs.unlinkSync(cognitivePath);
  } catch (_e) {}
  const tmp = `${cognitivePath}.tmp`;
  try {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  } catch (_e) {}
}

function purgeLearningStack() {
  const mods = [
    '../services/aiAnalyticsService',
    '../services/autonomousOptimizationService',
    '../services/supervisedLearningService',
    '../services/learningMemoryService',
    '../services/cognitivePersistenceService'
  ];
  for (const m of mods) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (_e) {}
  }
}

function testPersistenceOn() {
  cleanupFile();
  process.env.IMPETUS_COGNITIVE_PERSISTENCE_ENABLED = 'true';
  process.env.LEARNING_MEMORY_STORE = 'true';
  purgeLearningStack();

  const learningMemory = require('../services/learningMemoryService');
  const supervised = require('../services/supervisedLearningService');
  const aiAnalytics = require('../services/aiAnalyticsService');

  assert.ok(fs.existsSync(cognitivePath), 'ficheiro inicial criado');

  learningMemory.storeInteraction({
    input: 't1',
    output: { ok: true },
    context: {},
    confidence: 0.5
  });

  const pid = supervised.storeProposal({
    type: 'strategy_adjustment',
    suggestion: 's',
    action: 'reduce_assertiveness'
  });
  supervised.approveProposal(pid, { userId: 'smoke' });

  const snap = aiAnalytics.getCognitiveSnapshot();
  assert.strictEqual(snap.persistedToDisk, true);
  assert.ok(snap.interactions >= 1);
  assert.ok(snap.proposals >= 1);
}

function testPersistenceOffNoFile() {
  cleanupFile();
  process.env.IMPETUS_COGNITIVE_PERSISTENCE_ENABLED = 'false';
  process.env.LEARNING_MEMORY_STORE = 'true';
  purgeLearningStack();

  const learningMemory = require('../services/learningMemoryService');
  learningMemory.storeInteraction({
    input: 'off',
    output: {},
    context: {},
    confidence: null
  });
  assert.ok(!fs.existsSync(cognitivePath), 'sem persistência não deve criar JSON');
}

function main() {
  const prev = { ...process.env };
  try {
    testPersistenceOn();
    testPersistenceOffNoFile();
    console.log('[COGNITIVE_PERSISTENCE_SMOKE]', 'ok');
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
    cleanupFile();
    purgeLearningStack();
  }
}

main();
