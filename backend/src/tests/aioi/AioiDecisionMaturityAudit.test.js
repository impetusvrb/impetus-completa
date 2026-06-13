/**
 * AIOI-P8.5 — Decision Maturity Audit
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

const maturity = require('../../services/aioi/aioiDecisionMaturityService');

const INDICATORS = [
  'decision_coverage', 'decision_consistency', 'decision_traceability',
  'decision_quality', 'decision_maturity_score'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P8.5 — Decision Maturity Audit\n');

  await test('DM-DOC: spec existe', () => assert(readDoc('AIOI_DECISION_MATURITY_SPECIFICATION.md')));
  await test('DM-01: getDecisionMaturity', () => assert(typeof maturity.getDecisionMaturity === 'function'));

  for (const i of INDICATORS) {
    await test(`DM-IND: ${i}`, () => assert(readSrc('services/aioi/aioiDecisionMaturityService.js').includes(i)));
  }

  await test('DM-02: getDecisionMaturity executa', async () => {
    const r = await maturity.getDecisionMaturity();
    assert(typeof r.decision_maturity_score === 'number');
    assert(r.maturity_level);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
