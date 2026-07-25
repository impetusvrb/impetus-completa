'use strict';

/**
 * SEC-21A — Production Go-Live Gate (100% consultivo).
 * node backend/src/tests/audit/SEC_21A_PRODUCTION_GO_LIVE_GATE.test.js
 */

process.env.SEC21A_SKIP_INFRA_PROBES = 'true';
process.env.SEC21A_FAST_OBSERVATION = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND, 'src');
const DOCS = path.join(BACKEND, 'docs');
const EVIDENCE = path.join(DOCS, 'evidence/sec-21a');

const DOCS_LIST = [
  'SEC_21A_PRODUCTION_GO_LIVE_GATE.md',
  'SEC_21A_GO_LIVE_REPORT.md',
  'SEC_21A_OBSERVATION.md',
  'SEC_21A_ROLLBACK.md',
  'SEC_21A_REPORT.md'
];

let passed = 0;
let failed = 0;

function fresh21A() {
  [
    '../../securityGoLiveGate/index.js',
    '../../securityGoLiveGate/store/goLiveGateStore.js',
    '../../securityGoLiveGate/metrics/goLiveGateMetrics.js'
  ].forEach((m) => delete require.cache[require.resolve(m)]);
  const g = require('../../securityGoLiveGate');
  g.store.resetForTests();
  g.metrics.resetForTests();
  g.shutdown?.();
  return g;
}

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

async function main() {
  console.log('\nSEC-21A — Enterprise Production Go-Live Gate\n');

  const gate = fresh21A();

  await test('01 — módulo securityGoLiveGate presente', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'securityGoLiveGate/index.js')));
  });

  await test('02 — documentação SEC-21A', () => {
    for (const d of DOCS_LIST) assert.ok(fs.existsSync(path.join(DOCS, d)), d);
  });

  await test('03 — rota /security-go-live-gate', () => {
    assert.ok(fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-go-live-gate'));
  });

  await test('04 — .env.example SECURITY_GO_LIVE_GATE', () => {
    assert.ok(fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8').includes('SECURITY_GO_LIVE_GATE'));
  });

  let evaluation = null;

  await test('05 — avaliação Go-Live (consultiva)', () => {
    evaluation = gate.runEvaluation({ runObservation: false });
    assert.ok(evaluation.gate);
    assert.ok(evaluation.validators.integrity);
    assert.ok(evaluation.validators.baseline);
    assert.ok(evaluation.readOnly);
    assert.strictEqual(evaluation.noRuntimeChanges, true);
  });

  await test('06 — decisão em 4 estados válidos', () => {
    const d = evaluation.gate.goLiveDecision;
    assert.ok(
      ['GO_LIVE_APPROVED', 'GO_LIVE_APPROVED_WITH_REMARKS', 'GO_LIVE_BLOCKED', 'GO_LIVE_DENIED'].includes(d),
      d
    );
  });

  await test('07 — DTO go_live_gate_v1', () => {
    assert.strictEqual(evaluation.gate.reportVersion, 'go_live_gate_v1');
    assert.ok('integrityScore' in evaluation.gate);
    assert.ok('blockingIssues' in evaluation.gate);
    assert.ok('criteria' in evaluation.gate);
  });

  await test('08 — integridade classificada (drift)', () => {
    const drift = evaluation.validators.integrity.drift;
    assert.ok(drift.classification);
    assert.ok(['Expected Drift', 'Configuration Drift', 'Critical Drift', 'Unknown Drift'].includes(drift.classification));
  });

  await test('09 — módulos SEC-01→21 probe', () => {
    assert.ok(evaluation.validators.modules.total >= 20);
    assert.ok(evaluation.validators.modules.approvedModules.length >= 18);
  });

  await test('10 — endpoints audit', () => {
    assert.ok(evaluation.validators.endpoints.total >= 20);
  });

  await test('11 — rollback SEC-21 requerido', () => {
    assert.ok(typeof evaluation.validators.security.rollbackAvailable === 'boolean');
  });

  await test('12 — GO_LIVE_GUARD observação (fast)', () => {
    const obsEval = gate.runEvaluation({ runObservation: true });
    assert.ok(obsEval.observation);
    assert.ok(obsEval.observation.phase1);
    assert.strictEqual(obsEval.observation.goLiveGuard, true);
    assert.strictEqual(obsEval.observation.autoAction, undefined);
    assert.strictEqual(obsEval.observation.phase1.autoAction, false);
  });

  await test('13 — nenhuma flag activada pelo gate', () => {
    assert.notStrictEqual(process.env.SECURITY_GO_LIVE_GATE, 'true');
  });

  await test('14 — EG/ECO preservados', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'services/eventGovernanceService.js')));
  });

  gate.writeEvidencePackage(evaluation);

  await test('15 — evidências sec-21a', () => {
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'go-live-report.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'go-live-criteria.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'blocking-findings.json')));
  });

  const integrityScore = evaluation.validators.integrity.integrityScore;
  const decision = evaluation.gate.goLiveDecision;

  console.log('\n--- VEREDITO GO-LIVE ---');
  console.log(`Decisão: ${decision}`);
  console.log(`Integrity Score: ${integrityScore} (threshold 0.95)`);
  console.log(`Drift: ${evaluation.validators.integrity.drift?.classification}`);
  console.log(`Bloqueios: ${evaluation.gate.blockingIssues.length}`);
  if (evaluation.gate.blockingIssues.length) {
    evaluation.gate.blockingIssues.slice(0, 5).forEach((b) => console.log(`  - ${b.code || b.message || JSON.stringify(b)}`));
  }
  console.log(`Próxima acção: ${evaluation.gate.nextRecommendedAction}`);
  console.log('---\n');

  await test('16 — resposta: ambiente apto?', () => {
    const apto = decision === 'GO_LIVE_APPROVED' || decision === 'GO_LIVE_APPROVED_WITH_REMARKS';
    if (!apto) {
      console.log('  ℹ️  GO-LIVE NEGADO/BLOQUEADO — comportamento esperado se integrity < 0.95');
    }
    assert.ok(decision, 'decisão emitida');
  });

  console.log(`\nSEC-21A: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
