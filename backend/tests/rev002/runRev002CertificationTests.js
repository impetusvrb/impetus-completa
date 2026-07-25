'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { runBaselineCertification } = require('../../src/validation/rev002/rev002CertificationRuntime');
const { loadFrozenManifest } = require('../../src/validation/rev002/rev002ManifestLoader');
const { validateManifestIntegrity } = require('../../src/validation/rev002/rev002ManifestValidator');
const { validateEvidenceIntegrity } = require('../../src/validation/rev002/rev002EvidenceIntegrity');
const { validateGapFinalReview } = require('../../src/validation/rev002/rev002GapFinalReview');

const BACKEND = path.join(__dirname, '../..');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function runSuite(script) {
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'pipe', env: process.env });
  return { ok: r.status === 0, stderr: r.stderr?.toString() || '', stdout: r.stdout?.toString() || '' };
}

(async () => {
  console.log('REV-002 — Baseline Certification Gate (READ ONLY)\n');

  await test('frozen manifest loads', async () => {
    const m = loadFrozenManifest();
    assert.strictEqual(m.manifest_id, 'BASELINE-CANDIDATE-SUPPLY-WMS-v2.0');
  });

  await test('manifest integrity vs live system', async () => {
    const r = validateManifestIntegrity();
    assert.strictEqual(r.valid, true, r.issues.join(', '));
  });

  await test('evidence integrity — GF/WMS/INC/REV-001', async () => {
    const r = validateEvidenceIntegrity();
    assert.strictEqual(r.valid, true, r.missing.join(', '));
  });

  await test('GAP final review — no reopen, no new gaps', async () => {
    const r = validateGapFinalReview();
    assert.strictEqual(r.valid, true);
    assert.ok(r.partial_accepted.includes('GAP-LOG-002'));
  });

  let certification;
  await test('baseline certification runtime', async () => {
    certification = await runBaselineCertification();
    assert.ok(certification.approved, certification.blockers.join(', '));
    assert.ok(certification.authorize_baseline_creation);
    assert.ok(certification.regression.valid);
  });

  await test('verdict issued', async () => {
    assert.ok(
      certification.verdict === 'BASELINE-SUPPLY-v2.0 CERTIFIED' ||
        certification.verdict === 'BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS'
    );
  });

  const suites = [
    'test:architecture-conformance',
    'test:canonical-contracts',
    'test:cross-domain',
    'test:end-to-end'
  ];

  for (const suite of suites) {
    await test(`certification test: ${suite}`, async () => {
      const r = runSuite(suite);
      assert.ok(r.ok, r.stderr.slice(-400) || r.stdout.slice(-400));
    });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  console.log(`Verdict: ${certification.verdict}`);
  const db = require('../../src/db');
  await db.pool?.end?.();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
