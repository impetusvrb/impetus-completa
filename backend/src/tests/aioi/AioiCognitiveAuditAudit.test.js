/**
 * AIOI-P9.4 — Cognitive Audit Framework Audit
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

const audit = require('../../services/aioi/aioiCognitiveAuditService');

const FIELDS = [
  'audit_requirements', 'evidence_requirements',
  'traceability_requirements', 'approval_requirements'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.4 — Cognitive Audit Framework Audit\n');

  await test('AUD-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_AUDIT_SPECIFICATION.md')));
  await test('AUD-01: getCognitiveAuditFramework', () => assert(typeof audit.getCognitiveAuditFramework === 'function'));

  for (const f of FIELDS) {
    await test(`AUD-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveAuditService.js').includes(f)));
  }

  await test('AUD-02: specification only', () => {
    const r = audit.getCognitiveAuditFramework();
    assert.strictEqual(r.recording_enabled, false);
    assert.strictEqual(r.specification_only, true);
  });

  await test('AUD-03: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveAuditService.js'));
    assert(!c.includes('INSERT INTO'));
    assert(!c.includes('UPDATE '));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
