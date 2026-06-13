/**
 * AIOI-P8.1 — Decision Intelligence Audit
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

const intelligence = require('../../services/aioi/aioiDecisionIntelligenceService');

const OUTPUTS = [
  'operational_history', 'outcome_aggregation', 'compliance_aggregation',
  'risk_aggregation', 'sla_aggregation'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P8.1 — Decision Intelligence Audit\n');

  await test('DI-DOC: spec existe', () => assert(readDoc('AIOI_DECISION_INTELLIGENCE_SPECIFICATION.md')));
  await test('DI-01: aggregateDecisionIntelligence', () => assert(typeof intelligence.aggregateDecisionIntelligence === 'function'));

  for (const o of OUTPUTS) {
    await test(`DI-OUT: ${o}`, () => assert(readSrc('services/aioi/aioiDecisionIntelligenceService.js').includes(o)));
  }

  await test('DI-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiDecisionIntelligenceService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
    assert(!c.includes('INSERT INTO'));
  });

  await test('DI-03: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiDecisionIntelligenceService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
