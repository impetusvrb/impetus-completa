/**
 * AIOI-P5.3 — Audit Trail Audit
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

const auditTrail = require('../../services/aioi/aioiAuditTrailService');

const TRAILS = [
  'workflow_audit', 'execution_audit', 'learning_audit', 'outcome_audit',
  'worker_audit', 'health_audit', 'tenant_audit'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P5.3 — Audit Trail Audit\n');

  await test('AT-DOC: spec existe', () => assert(readDoc('AIOI_AUDIT_TRAIL_SPECIFICATION.md')));
  await test('AT-01: getConsolidatedAuditTrail', () => assert(typeof auditTrail.getConsolidatedAuditTrail === 'function'));

  for (const t of TRAILS) {
    await test(`AT-TRAIL: ${t}`, () => assert(readSrc('services/aioi/aioiAuditTrailService.js').includes(t)));
  }

  await test('AT-02: decision_audit', () => assert(readSrc('services/aioi/aioiAuditTrailService.js').includes('decision_audit')));

  await test('AT-03: sem alterar histórico', () => {
    const c = stripComments(readSrc('services/aioi/aioiAuditTrailService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('AT-04: trail executa', () => {
    const r = auditTrail.getConsolidatedAuditTrail();
    assert(r.workflow_audit && r.execution_audit && r.tenant_audit);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
