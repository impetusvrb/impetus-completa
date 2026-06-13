/**
 * AIOI-P6.2 — Certification Drift Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const certDrift = require('../../services/aioi/aioiCertificationDriftService');

const TARGETS = ['ORG-1', 'ORG-2', 'ORG-3', 'ORG-4', 'ORG-5', 'P1', 'P2', 'P3', 'P4', 'P5'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.2 — Certification Drift Audit\n');

  await test('CD-DOC: spec existe', () => assert(readDoc('AIOI_CERTIFICATION_DRIFT_SPECIFICATION.md')));
  await test('CD-01: detectCertificationDrift', () => assert(typeof certDrift.detectCertificationDrift === 'function'));

  for (const id of TARGETS) {
    await test(`CD-TARGET: ${id}`, () => assert(readSrc('services/aioi/aioiCertificationDriftService.js').includes(`'${id}'`)));
  }

  await test('CD-02: sem correção automática', () => {
    const r = certDrift.detectCertificationDrift();
    assert.strictEqual(r.auto_correction, false);
    const c = stripComments(readSrc('services/aioi/aioiCertificationDriftService.js')).toLowerCase();
    assert(!c.includes('autofix') && !c.includes('auto_fix'));
  });

  await test('CD-03: detectCertificationDrift executa', () => {
    const r = certDrift.detectCertificationDrift();
    assert(Array.isArray(r.certifications));
    assert(r.certifications.length >= 10);
  });

  await test('CD-04: org + phase compliance', () => {
    const r = certDrift.detectCertificationDrift();
    assert(r.org_compliance);
    assert(r.phase_compliance);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
