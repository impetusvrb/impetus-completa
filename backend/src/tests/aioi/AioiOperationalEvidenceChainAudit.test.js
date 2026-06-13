/**
 * AIOI-P1.4 — Operational Evidence Chain Audit
 * Modo: STATIC ANALYSIS · ZERO RUNTIME
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

const EVIDENCE_FIELDS = ['correlation_id', 'external_ref_id', 'evidence_refs', 'truth_state'];

const CHAIN_STAGES = [
  { label: 'IOE Ingestion', file: 'services/aioi/aioiEventIngestionService.js' },
  { label: 'Outbox Consumer', file: 'services/aioi/aioiOutboxConsumerService.js' },
  { label: 'Classification', file: 'services/aioi/aioiClassificationEngine.js' },
  { label: 'Decision Bridge', file: 'services/aioi/aioiDecisionBridgeService.js' },
  { label: 'Decision Payload', file: 'services/aioi/aioiDecisionPayloadBuilder.js' },
  { label: 'Execution Bridge', file: 'services/aioi/aioiExecutionBridgeService.js' },
  { label: 'Execution Payload', file: 'services/aioi/aioiExecutionPayloadBuilder.js' },
  { label: 'Outcome Builder', file: 'services/aioi/aioiOutcomePayloadBuilder.js' },
  { label: 'Learning Bridge', file: 'services/aioi/aioiLearningBridgeService.js' },
  { label: 'Learning Payload', file: 'services/aioi/aioiLearningPayloadBuilder.js' },
  { label: 'Queue Snapshot', file: 'services/aioi/aioiExecutiveQueueSnapshotProjectionService.js' }
];

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P1.4 — Operational Evidence Chain Audit\n');

  for (const stage of CHAIN_STAGES) {
    await test(`EV-${stage.label}: ficheiro existe`, () => {
      assert(readSrc(stage.file), `MISSING: ${stage.file}`);
    });
  }

  for (const stage of CHAIN_STAGES) {
    await test(`EV-${stage.label}: propaga correlation_id`, () => {
      const c = readSrc(stage.file);
      assert(c.includes('correlation_id'), `${stage.label} sem correlation_id`);
    });
  }

  const truthStages = CHAIN_STAGES.filter(s =>
    !['Classification'].includes(s.label)
  );
  for (const stage of truthStages) {
    await test(`EV-${stage.label}: referencia truth_state`, () => {
      const c = readSrc(stage.file);
      assert(c.includes('truth_state'), `${stage.label} sem truth_state`);
    });
  }

  for (const stage of CHAIN_STAGES) {
    await test(`EV-${stage.label}: referencia evidence_refs`, () => {
      const c = readSrc(stage.file);
      assert(c.includes('evidence_refs'), `${stage.label} sem evidence_refs`);
    });
  }

  await test('EV-IOE: scores_provisional na ingestão', () => {
    const c = readSrc('services/aioi/aioiEventIngestionService.js');
    assert(c.includes('scores_provisional'));
  });

  await test('EV-QUEUE: scores_provisional na projeção', () => {
    const c = readSrc('services/aioi/aioiExecutiveQueueSnapshotProjectionService.js');
    assert(c.includes('scores_provisional'));
  });

  await test('EV-ADAPTERS: external_ref_id nos adapters', () => {
    for (const f of ['plcAioiAdapter.js', 'mesAioiAdapter.js', 'taskAioiAdapter.js']) {
      const c = readSrc(`services/aioi/${f}`);
      assert(c.includes('external_ref_id'), `${f} sem external_ref_id`);
    }
  });

  await test('EV-OUTCOME: cadeia IOE→Outcome→Learning documentada em builder', () => {
    const c = readSrc('services/aioi/aioiOutcomePayloadBuilder.js');
    assert(c.includes('learning_context'));
    assert(c.includes('correlation_id'));
    assert(c.includes('truth_state'));
  });

  await test('EV-NOREMOVE: execution payload não filtra evidence_refs', () => {
    const c = readSrc('services/aioi/aioiExecutionPayloadBuilder.js');
    assert(!c.includes('evidence_refs = []') && !c.includes('evidence_refs: null'));
    assert(c.includes('evidence_refs'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
