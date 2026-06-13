/**
 * AIOI-P9.1 — Cognitive Authority Audit
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

const registry = require('../../services/aioi/aioiCognitiveAuthorityRegistryService');

const OUTPUTS = [
  'observable_domains', 'protected_domains', 'sovereign_domains', 'forbidden_domains'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.1 — Cognitive Authority Audit\n');

  await test('CA-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_AUTHORITY_SPECIFICATION.md')));
  await test('CA-01: getCognitiveAuthorityRegistry', () => assert(typeof registry.getCognitiveAuthorityRegistry === 'function'));

  for (const o of OUTPUTS) {
    await test(`CA-OUT: ${o}`, () => assert(readSrc('services/aioi/aioiCognitiveAuthorityRegistryService.js').includes(o)));
  }

  await test('CA-02: ORG-1..5 protegidos', () => {
    const r = registry.getCognitiveAuthorityRegistry();
    assert.strictEqual(r.protected_domains.filter(d => d.id.startsWith('ORG-')).length, 5);
    assert(r.org_sovereigns_protected);
  });

  await test('CA-03: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveAuthorityRegistryService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
