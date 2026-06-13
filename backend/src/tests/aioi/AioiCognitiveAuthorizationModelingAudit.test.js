/**
 * AIOI-P13.1 — Cognitive Authorization Modeling Audit
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

const modeling = require('../../services/aioi/aioiCognitiveAuthorizationModelingService');

const FIELDS = ['authorization_model_id', 'category', 'requested_level', 'required_controls', 'required_approvals', 'authorization_possible', 'generated_at'];
const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.1 — Cognitive Authorization Modeling Audit\n');

  await test('CAM-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_AUTHORIZATION_MODELING_SPECIFICATION.md')));
  await test('CAM-01: generateAuthorizationModels', () => assert(typeof modeling.generateAuthorizationModels === 'function'));

  for (const f of FIELDS) {
    await test(`CAM-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveAuthorizationModelingService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`CAM-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveAuthorizationModelingService.js').includes(`'${c}'`)));
  }

  await test('CAM-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveAuthorizationModelingService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('CAM-03: authorization_possible sempre false', () => {
    const c = readSrc('services/aioi/aioiCognitiveAuthorizationModelingService.js');
    assert(c.includes('authorization_possible: false'));
    assert(c.includes('all_authorization_denied'));
  });

  await test('CAM-04: executa', async () => {
    const r = await modeling.generateAuthorizationModels();
    assert.strictEqual(r.model_count, 7);
    assert(r.all_authorization_denied);
    assert(r.modeling_only);
    const first = r.models[0];
    for (const f of FIELDS) assert(first[f] !== undefined);
    assert.strictEqual(first.authorization_possible, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
