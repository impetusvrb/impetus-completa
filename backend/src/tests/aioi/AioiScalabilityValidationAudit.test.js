/**
 * AIOI-P4.2 — Scalability Validation Audit
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

const scalability = require('../../services/aioi/aioiScalabilityValidationService');

const SV_IDS = ['SV-01', 'SV-02', 'SV-03', 'SV-04', 'SV-05', 'SV-06', 'SV-07', 'SV-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P4.2 — Scalability Validation Audit\n');

  await test('SV-DOC: contract existe', () => assert(readDoc('AIOI_SCALABILITY_VALIDATION_CONTRACT.md')));
  await test('SV-01: validateScalability exportado', () => assert(typeof scalability.validateScalability === 'function'));

  for (const id of SV_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiScalabilityValidationService.js').includes(`'${id}'`)));
  }

  await test('SV-09: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiScalabilityValidationService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  await test('SV-10: validateScalability retorna checks', async () => {
    const r = await scalability.validateScalability();
    assert(Array.isArray(r.checks));
    assert.strictEqual(r.checks.length, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
