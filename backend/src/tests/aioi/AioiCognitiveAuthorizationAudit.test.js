/**
 * AIOI-P9.3 — Cognitive Authorization Audit
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

const authorization = require('../../services/aioi/aioiCognitiveAuthorizationService');

const LEVELS = ['NONE', 'OBSERVATION', 'RECOMMENDATION', 'ASSISTED_DECISION', 'RESTRICTED_EXECUTION'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.3 — Cognitive Authorization Audit\n');

  await test('CZ-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_AUTHORIZATION_SPECIFICATION.md')));
  await test('CZ-01: getAuthorizationState', () => assert(typeof authorization.getAuthorizationState === 'function'));
  await test('CZ-02: checkAuthorization', () => assert(typeof authorization.checkAuthorization === 'function'));

  for (const l of LEVELS) {
    await test(`CZ-LEVEL: ${l}`, () => assert(readSrc('services/aioi/aioiCognitiveAuthorizationService.js').includes(l)));
  }

  await test('CZ-03: todos não autorizados', () => {
    const s = authorization.getAuthorizationState();
    assert.strictEqual(s.authorized, false);
    assert.strictEqual(s.level, 'NONE');
    assert(s.levels.every(l => !l.authorized));
  });

  await test('CZ-04: checkAuthorization não autoriza', () => {
    const r = authorization.checkAuthorization('queue', 'activate');
    assert.strictEqual(r.authorized, false);
    assert.strictEqual(r.level, 'NONE');
  });

  await test('CZ-05: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveAuthorizationService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
