/**
 * AIOI-P9.2 — Cognitive Boundary Audit
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

const boundary = require('../../services/aioi/aioiCognitiveBoundaryService');

const CATEGORIES = ['OBSERVE_ONLY', 'RECOMMEND_ONLY', 'HITL_REQUIRED', 'EXECUTION_FORBIDDEN'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.2 — Cognitive Boundary Audit\n');

  await test('CB-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_BOUNDARY_SPECIFICATION.md')));
  await test('CB-01: getBoundaryCatalog', () => assert(typeof boundary.getBoundaryCatalog === 'function'));
  await test('CB-02: validateBoundary', () => assert(typeof boundary.validateBoundary === 'function'));

  for (const c of CATEGORIES) {
    await test(`CB-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveBoundaryService.js').includes(c)));
  }

  await test('CB-03: validação sem execução', () => {
    const r = boundary.validateBoundary('priority', 'recalculate');
    assert.strictEqual(r.execution_performed, false);
    assert.strictEqual(r.validation_only, true);
  });

  await test('CB-04: getBoundaryCatalog executa', () => {
    const r = boundary.getBoundaryCatalog();
    assert.strictEqual(r.execution_allowed, false);
    assert(r.total_boundaries >= 10);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
