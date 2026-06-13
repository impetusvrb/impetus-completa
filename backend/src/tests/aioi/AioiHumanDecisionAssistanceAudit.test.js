/**
 * AIOI-P12.1 — Human Decision Assistance Audit
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

const assistance = require('../../services/aioi/aioiHumanDecisionAssistanceService');

const FIELDS = ['assistance_id', 'category', 'observations', 'recommendations', 'evidence_chain', 'review_required', 'generated_at'];
const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.1 — Human Decision Assistance Audit\n');

  await test('HDA-DOC: spec existe', () => assert(readDoc('AIOI_HUMAN_DECISION_ASSISTANCE_SPECIFICATION.md')));
  await test('HDA-01: generateHumanDecisionAssistance', () => assert(typeof assistance.generateHumanDecisionAssistance === 'function'));

  for (const f of FIELDS) {
    await test(`HDA-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiHumanDecisionAssistanceService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`HDA-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiHumanDecisionAssistanceService.js').includes(`'${c}'`)));
  }

  await test('HDA-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiHumanDecisionAssistanceService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('HDA-03: review_required sempre true', () => {
    const c = readSrc('services/aioi/aioiHumanDecisionAssistanceService.js');
    assert(c.includes('review_required:  true'));
    assert(c.includes('all_review_required'));
  });

  await test('HDA-04: executa', async () => {
    const r = await assistance.generateHumanDecisionAssistance();
    assert(r.package_count >= 6);
    assert(r.all_review_required);
    assert(r.human_in_the_loop);
    const first = r.packages[0];
    for (const f of FIELDS) assert(first[f] !== undefined);
    assert.strictEqual(first.review_required, true);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
