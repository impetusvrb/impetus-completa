/**
 * AIOI-P8.3 — Decision Effectiveness Audit
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

const effectiveness = require('../../services/aioi/aioiDecisionEffectivenessService');

const METRICS = [
  'success_rate', 'partial_success_rate', 'failure_rate',
  'outcome_distribution', 'execution_distribution', 'learning_distribution'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P8.3 — Decision Effectiveness Audit\n');

  await test('DE-DOC: spec existe', () => assert(readDoc('AIOI_DECISION_EFFECTIVENESS_SPECIFICATION.md')));
  await test('DE-01: getDecisionEffectiveness', () => assert(typeof effectiveness.getDecisionEffectiveness === 'function'));

  for (const m of METRICS) {
    await test(`DE-METRIC: ${m}`, () => assert(readSrc('services/aioi/aioiDecisionEffectivenessService.js').includes(m)));
  }

  await test('DE-02: sem inferência', async () => {
    const r = await effectiveness.getDecisionEffectiveness();
    assert.strictEqual(r.effectiveness_summary.inference_enabled, false);
    assert.strictEqual(r.effectiveness_summary.prediction_enabled, false);
  });

  await test('DE-03: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiDecisionEffectivenessService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
