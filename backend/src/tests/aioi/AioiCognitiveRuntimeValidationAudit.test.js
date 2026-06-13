/**
 * AIOI-P15.1 — Cognitive Runtime Validation Audit
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

const validation = require('../../services/aioi/aioiCognitiveRuntimeValidationService');

const FIELDS = ['validation_id', 'runtime_requirements', 'runtime_constraints', 'runtime_dependencies', 'runtime_risks', 'runtime_possible', 'generated_at'];
const CATEGORIES = ['governance', 'compliance', 'assurance', 'knowledge', 'observation', 'recommendation', 'human_review', 'authorization', 'simulation'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.1 — Cognitive Runtime Validation Audit\n');

  await test('CRV-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_RUNTIME_VALIDATION_SPECIFICATION.md')));
  await test('CRV-01: generateRuntimeValidation', () => assert(typeof validation.generateRuntimeValidation === 'function'));

  for (const f of FIELDS) {
    await test(`CRV-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveRuntimeValidationService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`CRV-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveRuntimeValidationService.js').includes(`'${c}'`)));
  }

  await test('CRV-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveRuntimeValidationService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('CRV-03: runtime_possible sempre false', () => {
    const c = readSrc('services/aioi/aioiCognitiveRuntimeValidationService.js');
    assert(c.includes('runtime_possible:     false'));
    assert(c.includes('all_runtime_denied'));
  });

  await test('CRV-04: executa', async () => {
    const r = await validation.generateRuntimeValidation();
    assert.strictEqual(r.validation_count, 9);
    assert(r.all_runtime_denied);
    assert(r.validation_only);
    const first = r.validations[0];
    for (const f of FIELDS) assert(first[f] !== undefined);
    assert.strictEqual(first.runtime_possible, false);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
