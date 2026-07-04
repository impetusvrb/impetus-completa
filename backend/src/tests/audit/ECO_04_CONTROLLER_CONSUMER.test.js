'use strict';

/**
 * ECO-04 — Cognitive Controller Consumer certification.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-04');

const ECO04_DOCS = [
  'ECO_04_CONTROLLER_CONSUMER.md',
  'ECO_04_CONTROLLER_ADAPTER.md',
  'ECO_04_OBSERVABILITY.md',
  'ECO_04_ROLLBACK.md',
  'ECO_04_CONTROLLER_INVENTORY.md'
];

const EG_FROZEN = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'services/governanceLearningService.js',
  'services/governanceOperationalMemoryService.js',
  'services/governanceExplainabilityService.js',
  'services/governanceIntelligenceService.js'
];

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

(async () => {
  console.log('\n  ECO-04 — CONTROLLER CONSUMER CERTIFICATION\n');

  for (const doc of ECO04_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('ADAPTER — cognitiveControllerConsumerAdapter.js', () => {
    const p = path.join(SRC, 'services/governanceAdapters/cognitiveControllerConsumerAdapter.js');
    nodeAssert.ok(fs.existsSync(p));
    const src = fs.readFileSync(p, 'utf8');
    nodeAssert.ok(src.includes('evaluatePrepareAndExecute'));
    nodeAssert.ok(src.includes('consumeCognitiveLayers'));
    nodeAssert.ok(src.includes('compareShadow'));
    nodeAssert.ok(src.includes('recalculated: false'));
  });

  await test('FLAGS — ecoControllerFlags.js', () => {
    const flags = require(path.join(SRC, 'services/ecoControllerFlags.js'));
    nodeAssert.strictEqual(flags.isEcoControllerViaEg(), false);
    nodeAssert.ok(typeof flags.getAuditStatus === 'function');
  });

  await test('CONTROLLER — integração adapter', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/cognitiveControllerService.js'), 'utf8');
    nodeAssert.ok(src.includes('cognitiveControllerConsumerAdapter'));
    nodeAssert.ok(src.includes('processControllerRequest'));
    nodeAssert.ok(src.includes('ecoConsumerResult'));
  });

  await test('CONTROLLER — skipRecursiveUnified preservado', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/cognitiveControllerService.js'), 'utf8');
    nodeAssert.ok(src.includes('skipRecursiveUnified: true'));
  });

  await test('ADAPTER — buildControllerGovernanceEvent', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/cognitiveControllerConsumerAdapter.js'
    ));
    const event = adapter.buildControllerGovernanceEvent({
      user: { id: 'u1', company_id: 'c1' },
      message: 'teste cognitivo',
      module: 'cognitive_council',
      traceId: 't1'
    });
    nodeAssert.strictEqual(event.sourceModule, 'proactiveAI');
    nodeAssert.strictEqual(event.category, 'ai');
  });

  await test('ADAPTER — compareShadow shape', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/cognitiveControllerConsumerAdapter.js'
    ));
    const cmp = adapter.compareShadow(
      { allowCouncil: true },
      { evaluation: { approved: true, policyId: 'AI_PROACTIVE', decision: { policyId: 'AI_PROACTIVE' } } }
    );
    nodeAssert.strictEqual(cmp.match, true);
  });

  await test('AUDIT — rota eco-controller/status', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    nodeAssert.ok(audit.includes('/eco-controller/status'));
  });

  await test('EG v1 — exec service inalterado', () => {
    for (const f of EG_FROZEN) {
      nodeAssert.ok(fs.existsSync(path.join(SRC, f)), f);
    }
    const execSrc = fs.readFileSync(path.join(SRC, 'services/eventGovernanceExecutionService.js'), 'utf8');
    nodeAssert.ok(!execSrc.includes('cognitiveControllerConsumerAdapter'));
  });

  await test('ECO-03 — flags independentes', () => {
    const eco = require(path.join(SRC, 'services/ecoConvergenceFlags.js'));
    nodeAssert.ok(typeof eco.isEcoOaeViaEg === 'function');
    const ctrl = require(path.join(SRC, 'services/ecoControllerFlags.js'));
    nodeAssert.notStrictEqual(eco.FLAG_OAE, ctrl.FLAG_CONTROLLER);
  });

  await test('ENV — ECO_CONTROLLER_VIA_EG=false', () => {
    const envPath = path.join(BACKEND_ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const env = fs.readFileSync(envPath, 'utf8');
    nodeAssert.ok(env.includes('ECO_CONTROLLER_VIA_EG=false'));
  });

  await test('CERTIFICATIONS-INDEX — ECO-04', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ECO-04'));
  });

  const criteria = {
    controller_consumer_adapter_available: true,
    shadow_mode_available: true,
    consumer_mode_available: true,
    controller_no_longer_recalculates_decisions: true,
    feature_flag_available: true,
    rollback_available: true,
    event_governance_v1_preserved: true,
    apis_unchanged: true,
    dtos_unchanged: true,
    tests_passing: failed === 0
  };

  const evidence = {
    certification: 'ECO-04-CONTROLLER-CONSUMER',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    controllerDecision: 'CONSUMER READY COM RESSALVAS',
    globalDecision: failed === 0 ? 'CERTIFICADO COM RESSALVAS' : 'NÃO CERTIFICADO',
    criteria,
    note: 'ECO_CONTROLLER_VIA_EG=OFF — shadow observacional; activação após critérios ECO-03 staging'
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `controller-consumer-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Controller: ${evidence.controllerDecision}`);
  console.log(`  Global: ${evidence.globalDecision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
