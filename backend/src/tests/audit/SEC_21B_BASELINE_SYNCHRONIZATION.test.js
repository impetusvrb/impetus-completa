'use strict';

/**
 * SEC-21B — Enterprise Baseline Synchronization & Integrity Reconciliation (100% consultivo).
 * node backend/src/tests/audit/SEC_21B_BASELINE_SYNCHRONIZATION.test.js
 */

process.env.SEC04_SKIP_GIT_CHECK = 'true';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND, 'src');
const DOCS = path.join(BACKEND, 'docs');
const EVIDENCE = path.join(DOCS, 'evidence/sec-21b');

let passed = 0;
let failed = 0;

function fresh21B() {
  [
    '../../securityBaselineSynchronization/index.js',
    '../../securityBaselineSynchronization/store/baselineSynchronizationStore.js',
    '../../securityBaselineSynchronization/metrics/baselineSynchronizationMetrics.js'
  ].forEach((m) => delete require.cache[require.resolve(m)]);
  const mod = require('../../securityBaselineSynchronization');
  mod.store.resetForTests();
  mod.metrics.resetForTests();
  mod.shutdown?.();
  return mod;
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
  console.log('\nSEC-21B — Enterprise Baseline Synchronization\n');

  const mod = fresh21B();

  await test('01 — módulo securityBaselineSynchronization presente', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'securityBaselineSynchronization/index.js')));
  });

  await test('02 — documentação SEC-21B', () => {
    assert.ok(fs.existsSync(path.join(DOCS, 'SEC_21B_BASELINE_SYNCHRONIZATION.md')));
  });

  await test('03 — rota /security-baseline-synchronization', () => {
    assert.ok(
      fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-baseline-synchronization')
    );
  });

  await test('04 — .env.example SECURITY_BASELINE_SYNCHRONIZATION', () => {
    assert.ok(fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8').includes('SECURITY_BASELINE_SYNCHRONIZATION'));
  });

  let evaluation = null;

  await test('05 — reconciliação baseline (consultiva)', () => {
    evaluation = mod.runSynchronization();
    assert.ok(evaluation.decision);
    assert.ok(evaluation.analysis);
    assert.strictEqual(evaluation.readOnly, true);
    assert.strictEqual(evaluation.noManifestUpdate, true);
  });

  await test('06 — decisão em 2 estados válidos', () => {
    const d = evaluation.decision.reconciliationDecision;
    assert.ok(['BASELINE_SYNCHRONIZATION_APPROVED', 'BASELINE_SYNCHRONIZATION_DENIED'].includes(d), d);
  });

  await test('07 — DTO baseline_synchronization_v1', () => {
    assert.strictEqual(evaluation.decision.reportVersion, 'baseline_synchronization_v1');
    assert.ok('integrityBefore' in evaluation.decision);
    assert.ok('integrityProjected' in evaluation.decision);
    assert.ok('certifiedChanges' in evaluation.decision);
  });

  await test('08 — divergências SEC-21A analisadas', () => {
    assert.ok(evaluation.analysis.totalDivergences >= 5);
    assert.ok(evaluation.analysis.analyzed.every((a) => a.classification));
    assert.ok(evaluation.analysis.analyzed.every((a) => a.questions));
  });

  await test('09 — classificações obrigatórias', () => {
    const valid = [
      'CERTIFIED_EVOLUTION',
      'EXPECTED_OPERATIONAL_CHANGE',
      'EXPECTED_SECURITY_CHANGE',
      'UNEXPECTED_MODIFICATION',
      'UNKNOWN_CHANGE',
      'CRITICAL_INVESTIGATION_REQUIRED'
    ];
    for (const a of evaluation.analysis.analyzed) {
      assert.ok(valid.includes(a.classification), a.path + ' -> ' + a.classification);
    }
  });

  await test('10 — listas reconciliação', () => {
    assert.ok(evaluation.report.lists);
    assert.ok(Array.isArray(evaluation.report.lists.approvableChanges));
    assert.ok(Array.isArray(evaluation.report.lists.rejectedChanges));
    assert.ok(Array.isArray(evaluation.report.lists.pendingChanges));
  });

  await test('11 — critérios obrigatórios', () => {
    const c = evaluation.decision.criteria;
    assert.strictEqual(c.drift_analyzed, true);
    assert.strictEqual(c.no_runtime_changes, true);
    assert.strictEqual(c.no_security_changes, true);
    assert.strictEqual(c.enterprise_baseline_preserved, true);
    assert.strictEqual(c.baseline_decision_available, true);
  });

  await test('12 — não actualiza manifest', () => {
    const manifest = path.join(DOCS, 'evidence/security-baseline-01/critical-files.sha256.manifest');
    const before = fs.readFileSync(manifest, 'utf8');
    mod.runSynchronization();
    const after = fs.readFileSync(manifest, 'utf8');
    assert.strictEqual(before, after);
  });

  await test('13 — nenhuma flag activada', () => {
    assert.notStrictEqual(process.env.SECURITY_BASELINE_SYNCHRONIZATION, 'true');
  });

  await test('14 — EG/ECO preservados', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'services/eventGovernanceService.js')));
  });

  mod.writeEvidencePackage(evaluation);

  await test('15 — evidências sec-21b', () => {
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'synchronization-latest.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'divergence-analysis.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'reconciliation-lists.json')));
  });

  const d = evaluation.decision;

  console.log('\n--- VEREDITO RECONCILIAÇÃO ---');
  console.log(`Decisão: ${d.reconciliationDecision}`);
  console.log(`Integrity antes: ${d.integrityBefore} → projectado: ${d.integrityProjected}`);
  console.log(`Aprováveis: ${d.filesEligibleForBaseline.length}`);
  d.filesEligibleForBaseline.forEach((p) => console.log(`  + ${p}`));
  console.log(`Rejeitados: ${d.filesRejected.length}`);
  console.log(`Pendentes: ${d.pendingChanges.length}`);
  console.log(`Próxima acção: ${d.nextAction}`);
  if (d.baselineUpdateCommand) console.log(`Comando (não executado): ${d.baselineUpdateCommand}`);
  console.log('---\n');

  await test('16 — resposta: baseline pode ser actualizada?', () => {
    assert.ok(d.reconciliationDecision, 'decisão emitida');
  });

  console.log(`\nSEC-21B: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
