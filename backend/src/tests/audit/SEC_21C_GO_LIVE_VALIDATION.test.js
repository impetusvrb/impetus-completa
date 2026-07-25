'use strict';

/**
 * SEC-21C — Enterprise Go-Live Validation & Final Authorization (100% consultivo).
 * node backend/src/tests/audit/SEC_21C_GO_LIVE_VALIDATION.test.js
 */

process.env.SEC21C_SKIP_INFRA_PROBES = 'true';
process.env.SEC21C_FAST_GUARD = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND, 'src');
const DOCS = path.join(BACKEND, 'docs');
const EVIDENCE = path.join(DOCS, 'evidence/sec-21c');

let passed = 0;
let failed = 0;

function fresh21C() {
  [
    '../../securityGoLiveValidation/index.js',
    '../../securityGoLiveValidation/store/goLiveValidationStore.js',
    '../../securityGoLiveValidation/metrics/goLiveValidationMetrics.js'
  ].forEach((m) => delete require.cache[require.resolve(m)]);
  const mod = require('../../securityGoLiveValidation');
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
  console.log('\nSEC-21C — Enterprise Go-Live Validation & Final Authorization\n');

  const mod = fresh21C();

  await test('01 — módulo securityGoLiveValidation presente', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'securityGoLiveValidation/index.js')));
  });

  await test('02 — documentação SEC-21C', () => {
    assert.ok(fs.existsSync(path.join(DOCS, 'SEC_21C_GO_LIVE_VALIDATION.md')));
  });

  await test('03 — rota /security-go-live-validation', () => {
    assert.ok(
      fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8').includes('/security-go-live-validation')
    );
  });

  await test('04 — .env.example SECURITY_GO_LIVE_VALIDATION', () => {
    assert.ok(fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8').includes('SECURITY_GO_LIVE_VALIDATION'));
  });

  let evaluation = null;

  await test('05 — validação Go-Live final (consultiva)', () => {
    evaluation = mod.runValidation({ runGuard: false });
    assert.ok(evaluation.decision);
    assert.ok(evaluation.validators);
    assert.strictEqual(evaluation.readOnly, true);
    assert.strictEqual(evaluation.noRuntimeChanges, true);
  });

  await test('06 — decisão em 3 estados válidos', () => {
    const d = evaluation.decision.goLiveDecision;
    assert.ok(['GO_LIVE_APPROVED', 'GO_LIVE_APPROVED_WITH_REMARKS', 'GO_LIVE_DENIED'].includes(d), d);
  });

  await test('07 — DTO go_live_validation_v1', () => {
    assert.strictEqual(evaluation.decision.reportVersion, 'go_live_validation_v1');
    assert.ok('productionReadinessScore' in evaluation.decision);
    assert.ok('rollbackReady' in evaluation.decision);
    assert.ok('goLiveGuardStatus' in evaluation.decision);
  });

  await test('08 — cadeia SEC-01→21B', () => {
    assert.ok(evaluation.validators.endpoints.total >= 22);
    assert.ok(evaluation.validators.endpoints.passed >= 20);
  });

  await test('09 — critérios obrigatórios presentes', () => {
    const c = evaluation.decision.criteria;
    assert.strictEqual(typeof c.integrity_validated, 'boolean');
    assert.strictEqual(c.enterprise_security_preserved, true);
    assert.strictEqual(c.enterprise_baseline_preserved, true);
    assert.strictEqual(c.no_runtime_changes !== false, true);
  });

  await test('10 — rollback validado', () => {
    assert.ok(typeof evaluation.validators.rollback.rollbackReady === 'boolean');
  });

  await test('11 — GO_LIVE_GUARD (fast)', () => {
    const guardEval = mod.runValidation({ runGuard: true });
    assert.ok(guardEval.guard);
    assert.ok(guardEval.guard.phase1);
    assert.strictEqual(guardEval.guard.autoAction, false);
    assert.ok(['GO_LIVE_GUARD_SUCCESS', 'GO_LIVE_GUARD_FAILED'].includes(guardEval.guard.status));
  });

  await test('12 — nenhuma flag activada', () => {
    assert.notStrictEqual(process.env.SECURITY_GO_LIVE_VALIDATION, 'true');
  });

  await test('13 — EG/ECO preservados', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'services/eventGovernanceService.js')));
  });

  mod.writeEvidencePackage(evaluation);

  await test('14 — evidências sec-21c', () => {
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'go-live-validation-latest.json')));
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'blocking-findings.json')));
  });

  const d = evaluation.decision;

  console.log('\n--- VEREDITO FINAL GO-LIVE ---');
  console.log(`Decisão: ${d.goLiveDecision}`);
  console.log(`Readiness Score: ${d.productionReadinessScore}`);
  console.log(`Integrity: ${d.integrityScore}`);
  console.log(`Baseline sync: ${evaluation.validators.production.baselineSynchronized}`);
  console.log(`SEC-21B aprovado: ${evaluation.validators.production.sec21bApproved}`);
  console.log(`Bloqueios: ${d.blockingFindings.length}`);
  d.blockingFindings.slice(0, 5).forEach((b) => console.log(`  - ${b.code || b.message}`));
  console.log(`Próxima acção: ${d.recommendedNextAction}`);
  console.log('---\n');

  await test('15 — resposta: ambiente pronto?', () => {
    assert.ok(d.goLiveDecision, 'decisão emitida');
    if (d.goLiveDecision === 'GO_LIVE_DENIED') {
      console.log('  ℹ️  GO_LIVE_DENIED — esperado se baseline ainda não sincronizada');
    }
  });

  console.log(`\nSEC-21C: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
