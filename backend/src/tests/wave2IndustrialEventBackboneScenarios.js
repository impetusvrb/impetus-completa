'use strict';

/**
 * WAVE 2 / PROMPT 23 — Industrial Event Backbone scenarios.
 */

const { v4: uuidv4 } = require('uuid');

let passed = 0;
let failed = 0;
const COMPANY_ID = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

const savedEnv = {};

function saveEnv(keys) {
  for (const k of keys) {
    savedEnv[k] = process.env[k];
  }
}

function restoreEnv(keys) {
  for (const k of keys) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

const ENV_KEYS = [
  'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
  'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED',
  'IMPETUS_INDUSTRIAL_DLQ_ENABLED',
  'IMPETUS_INDUSTRIAL_BACKBONE_MODE',
  'IMPETUS_INDUSTRIAL_PARTITIONING_ENABLED',
  'IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED',
  'IMPETUS_INDUSTRIAL_STREAM_RECOVERY_ENABLED',
  'IMPETUS_INDUSTRIAL_REPLAY_MODE',
  'IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE',
  'IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER',
  'IMPETUS_EVENT_THROTTLE_PER_TENANT'
];

(async () => {
  console.log('\n══ WAVE 2 — INDUSTRIAL EVENT BACKBONE (PROMPT 23) ══\n');
  saveEnv(ENV_KEYS);

  try {
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'true';
    process.env.IMPETUS_INDUSTRIAL_OUTBOX_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_DLQ_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_BACKBONE_MODE = 'audit';
    process.env.IMPETUS_INDUSTRIAL_PARTITIONING_ENABLED = 'true';
    process.env.IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED = 'false';
    process.env.IMPETUS_INDUSTRIAL_STREAM_RECOVERY_ENABLED = 'true';
    process.env.IMPETUS_INDUSTRIAL_REPLAY_MODE = 'shadow';
    process.env.IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE = 'observe';
    process.env.IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER = 'false';
    process.env.IMPETUS_EVENT_THROTTLE_PER_TENANT = 'false';

    console.log('── Flags W2 ──');
    const flags = require('../eventPipeline/industrialFlags');
    assert('W2.1 backbone mode audit', flags.industrialBackboneMode() === 'audit');
    assert('W2.2 replay dry-run shadow', flags.isReplayDryRun() === true);

    console.log('\n── Partition ──');
    const partition = require('../eventPipeline/partition/partitionKeyService');
    const enriched = partition.enrichPartitionFields({
      company_id: COMPANY_ID,
      occurred_at: '2026-05-27T12:00:00.000Z'
    });
    assert('W2.3 partition_month YYYY-MM', enriched.partition_month === '2026-05');
    assert('W2.4 composite partition_key', enriched.partition_key.includes(COMPANY_ID));

    console.log('\n── Backpressure ──');
    const bp = require('../eventPipeline/backpressure/backpressureController');
    const bpResult = await bp.checkPublishBackpressure({
      company_id: COMPANY_ID,
      event_name: 'quality.ncr.opened',
      domain: 'quality'
    });
    assert('W2.5 backpressure allowed observe', bpResult.allowed === true);

    console.log('\n── Governance ──');
    const gov = require('../eventPipeline/governance/industrialRetentionGovernance');
    const snap = await gov.getGovernanceSnapshot();
    assert('W2.6 governance policies outbox', snap.policies.industrial_event_outbox != null);
    assert('W2.7 governance archive policy', snap.policies.industrial_event_archive != null);

    console.log('\n── Publish (memory outbox) ──');
    delete require.cache[require.resolve('../eventPipeline/industrialEventBackbone')];
    const backbone = require('../eventPipeline/industrialEventBackbone');
    const pub = await backbone.publishIndustrialEvent({
      event_name: 'quality.ncr.opened',
      company_id: COMPANY_ID,
      correlation_id: `w2-test-${uuidv4().slice(0, 8)}`,
      payload: { test: true, wave: 2 }
    });
    assert('W2.8 publish ok', pub.ok === true);
    assert('W2.9 envelope partition_month', !!pub.envelope?.partition_month);

    console.log('\n── Replay orchestrator (shadow) ──');
    const orch = require('../eventPipeline/replay/industrialReplayOrchestrator');
    const replay = await orch.runGovernedReplay({ limit: 5, source: 'memory', mode: 'shadow' });
    assert('W2.10 replay shadow ok', replay.ok === true);

    console.log('\n── Health W2 ──');
    const health = backbone.getIndustrialBackboneHealth();
    assert('W2.11 health wave2 section', health.wave2 && health.wave2.backbone_mode === 'audit');

    console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    restoreEnv(ENV_KEYS);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
