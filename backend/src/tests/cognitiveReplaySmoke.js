'use strict';

const assert = require('assert');

function purgeReplay() {
  delete require.cache[require.resolve('../services/cognitiveDbPersistenceService')];
  delete require.cache[require.resolve('../services/cognitiveReplayService')];
}

function testCompareReplayWithCurrent() {
  const cognitiveReplayService = require('../services/cognitiveReplayService');
  const replay = {
    reconstructed_state: { confidence: 0.4, data_state: 'tenant_empty', module: 'x' }
  };
  const cmp = cognitiveReplayService.compareReplayWithCurrent(replay, {
    confidence: 0.5,
    data_state: 'production_active'
  });
  assert.ok(Math.abs(cmp.confidence_delta - 0.1) < 1e-9);
  assert.strictEqual(cmp.data_state_changed, true);

  const cmp2 = cognitiveReplayService.compareReplayWithCurrent(replay, {
    confidence: 0.4,
    data_state: 'tenant_empty'
  });
  assert.strictEqual(cmp2.data_state_changed, false);
}

function testTruncateRedact() {
  const cognitiveReplayService = require('../services/cognitiveReplayService');
  const big = { password: 'x', ok: 'y', nested: { token: 'z' } };
  const red = cognitiveReplayService.redactForReplay(big);
  assert.strictEqual(red.password, '[REDACTED]');
  assert.strictEqual(red.nested.token, '[REDACTED]');
  const huge = { a: 'x'.repeat(60000) };
  const tr = cognitiveReplayService.truncatePayloadTree(huge);
  assert.strictEqual(tr._truncated, true);
}

async function main() {
  const envBackup = { ...process.env };
  try {
    purgeReplay();
    testCompareReplayWithCurrent();
    testTruncateRedact();

    process.env.IMPETUS_COGNITIVE_REPLAY_ENABLED = 'false';
    purgeReplay();
    const off = require('../services/cognitiveReplayService');
    assert.strictEqual(off.isReplayEnabled(), false);
    const r1 = await off.replayInteraction('00000000-0000-4000-8000-000000000001', null);
    assert.strictEqual(r1.error, 'REPLAY_DISABLED');

    process.env.IMPETUS_COGNITIVE_REPLAY_ENABLED = 'true';
    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'false';
    purgeReplay();
    const on = require('../services/cognitiveReplayService');
    const r2 = await on.replayInteraction('00000000-0000-4000-8000-000000000099', null);
    assert.strictEqual(r2.error, 'COGNITIVE_DB_DISABLED');

    process.env.IMPETUS_COGNITIVE_DB_ENABLED = 'true';
    purgeReplay();
    const dbMod = require('../services/cognitiveDbPersistenceService');
    const snapBad = await dbMod.getCognitiveSnapshotAt('not-a-date');
    assert.strictEqual(snapBad.error, 'INVALID_DATE');

    console.log('[COGNITIVE_REPLAY_SMOKE]', 'ok');
  } finally {
    for (const k of Object.keys(envBackup)) {
      if (envBackup[k] === undefined) delete process.env[k];
      else process.env[k] = envBackup[k];
    }
    purgeReplay();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
