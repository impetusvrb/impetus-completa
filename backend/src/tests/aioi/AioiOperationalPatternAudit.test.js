/**
 * AIOI-P7.3 — Operational Pattern Audit
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

const patterns = require('../../services/aioi/aioiOperationalPatternService');

const PATTERN_TYPES = [
  'event_recurrence', 'outcome_recurrence', 'risk_recurrence',
  'sla_recurrence', 'capacity_recurrence'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.3 — Operational Pattern Audit\n');

  await test('OP-DOC: spec existe', () => assert(readDoc('AIOI_OPERATIONAL_PATTERN_SPECIFICATION.md')));
  await test('OP-01: getOperationalPatterns', () => assert(typeof patterns.getOperationalPatterns === 'function'));

  for (const p of PATTERN_TYPES) {
    await test(`OP-PATTERN: ${p}`, () => assert(readSrc('services/aioi/aioiOperationalPatternService.js').includes(p)));
  }

  await test('OP-02: sem inferência/previsão', () => {
    const c = readSrc('services/aioi/aioiOperationalPatternService.js');
    assert(c.includes('inference_enabled'));
    assert(c.includes('prediction_enabled'));
    assert(c.includes('STATISTICAL_COUNT'));
  });

  await test('OP-03: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalPatternService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  await test('OP-04: getOperationalPatterns executa', async () => {
    const r = await patterns.getOperationalPatterns();
    assert.strictEqual(r.inference_enabled, false);
    assert.strictEqual(r.prediction_enabled, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
