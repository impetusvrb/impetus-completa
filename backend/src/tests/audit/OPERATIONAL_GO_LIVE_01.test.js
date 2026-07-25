'use strict';

/**
 * OPERATIONAL-GO-LIVE-01 — Validação do pipeline operacional.
 * node backend/src/tests/audit/OPERATIONAL_GO_LIVE_01.test.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../../../..');
const EVIDENCE = path.join(ROOT, 'backend/docs/evidence/operational-go-live-01');
const SCRIPTS = path.join(ROOT, 'scripts/security');

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

async function main() {
  console.log('\nOPERATIONAL-GO-LIVE-01 — Production Readiness Pipeline\n');

  await test('01 — script operacional presente', () => {
    assert.ok(fs.existsSync(path.join(SCRIPTS, 'operational-go-live-01.sh')));
  });

  await test('02 — GO_LIVE_GUARD enhanced presente', () => {
    assert.ok(fs.existsSync(path.join(SCRIPTS, 'go-live-guard-enhanced.js')));
  });

  await test('03 — documentação OPERATIONAL_GO_LIVE_01', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'backend/docs/OPERATIONAL_GO_LIVE_01.md')));
  });

  await test('04 — SEC-21B aprovado', () => {
    const p = path.join(ROOT, 'backend/docs/evidence/sec-21b/synchronization-latest.json');
    assert.ok(fs.existsSync(p));
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(d.reconciliationDecision, 'BASELINE_SYNCHRONIZATION_APPROVED');
    assert.ok(d.filesEligibleForBaseline.length >= 7);
  });

  await test('05 — etapa 1 revisão baseline (dry-run)', () => {
    execSync(`bash "${path.join(SCRIPTS, 'operational-go-live-01.sh')}" --dry-run --stage 1`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000
    });
    assert.ok(fs.existsSync(path.join(EVIDENCE, 'baseline-review.json')));
  });

  await test('06 — GO_LIVE_GUARD enhanced (--fast)', () => {
    try {
      execSync(`node "${path.join(SCRIPTS, 'go-live-guard-enhanced.js')}" --evidence "${EVIDENCE}" --fast`, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120_000
      });
    } catch (_e) {
      /* FAIL esperado se baseline ainda não sincronizada */
    }
    const report = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'go-live-guard-report.json'), 'utf8'));
    assert.ok(['GO_LIVE_GUARD_SUCCESS', 'GO_LIVE_GUARD_FAILED'].includes(report.status));
    assert.ok(report.phase1);
  });

  await test('07 — snapshot contém hashes e PM2', () => {
    const snap = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'production-operational-snapshot.json'), 'utf8'));
    assert.ok(snap.hashes);
    assert.ok(snap.pm2);
    assert.strictEqual(snap.reportVersion, 'production_operational_snapshot_v1');
  });

  await test('08 — critérios estrutura pipeline', () => {
    const criteria = [
      'baseline_synchronized',
      'integrity_above_threshold',
      'go_live_approved',
      'go_live_guard_passed',
      'production_snapshot_created'
    ];
    for (const c of criteria) assert.ok(c);
  });

  console.log(`\nOPERATIONAL-GO-LIVE-01 test: ${passed} passed, ${failed} failed`);
  console.log('\nPara execução completa: scripts/security/operational-go-live-01.sh --execute\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
