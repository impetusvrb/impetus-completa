/**
 * AIOI-P7.5 — Knowledge Maturity Audit
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

const maturity = require('../../services/aioi/aioiKnowledgeMaturityService');

const INDICATORS = [
  'knowledge_coverage', 'knowledge_completeness', 'knowledge_consistency',
  'knowledge_quality', 'knowledge_maturity_score'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.5 — Knowledge Maturity Audit\n');

  await test('KM-DOC: spec existe', () => assert(readDoc('AIOI_KNOWLEDGE_MATURITY_SPECIFICATION.md')));
  await test('KM-01: getKnowledgeMaturity', () => assert(typeof maturity.getKnowledgeMaturity === 'function'));

  for (const i of INDICATORS) {
    await test(`KM-IND: ${i}`, () => assert(readSrc('services/aioi/aioiKnowledgeMaturityService.js').includes(i)));
  }

  await test('KM-02: getKnowledgeMaturity executa', async () => {
    const r = await maturity.getKnowledgeMaturity();
    assert(typeof r.knowledge_maturity_score === 'number');
    assert(r.maturity_level);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
