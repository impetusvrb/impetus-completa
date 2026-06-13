/**
 * AIOI-P4.3 — Governance Drift Audit
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

const drift = require('../../services/aioi/aioiGovernanceDriftService');

const DOMAINS = [
  'Queue Sovereignty', 'Truth Sovereignty', 'Workflow Governance',
  'Pilot Governance', 'Execution Governance', 'Learning Governance'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P4.3 — Governance Drift Audit\n');

  await test('GD-DOC: spec existe', () => assert(readDoc('AIOI_GOVERNANCE_DRIFT_SPECIFICATION.md')));
  await test('GD-01: detectGovernanceDrift exportado', () => assert(typeof drift.detectGovernanceDrift === 'function'));

  for (const d of DOMAINS) {
    await test(`GD-DOMAIN: ${d}`, () => assert(readSrc('services/aioi/aioiGovernanceDriftService.js').includes(d)));
  }

  await test('GD-02: sem correção automática', () => {
    const c = stripComments(readSrc('services/aioi/aioiGovernanceDriftService.js')).toLowerCase();
    assert(!c.includes('autofix') && !c.includes('auto_fix'));
    assert(!c.includes('update industrial_operational_events'));
  });

  await test('GD-03: detectGovernanceDrift executa', () => {
    const r = drift.detectGovernanceDrift();
    assert(Array.isArray(r.domains));
    assert(r.domains.length >= 6);
  });

  await test('GD-04: drift_detected flag', () => {
    const r = drift.detectGovernanceDrift();
    assert(typeof r.drift_detected === 'boolean');
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
