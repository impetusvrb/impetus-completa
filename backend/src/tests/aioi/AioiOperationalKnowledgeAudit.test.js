/**
 * AIOI-P7.1 — Operational Knowledge Audit
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

const knowledge = require('../../services/aioi/aioiOperationalKnowledgeService');

const OUTPUTS = [
  'operational_knowledge', 'recurring_events', 'outcome_catalog',
  'sla_patterns', 'recurring_risks'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.1 — Operational Knowledge Audit\n');

  await test('OK-DOC: spec existe', () => assert(readDoc('AIOI_OPERATIONAL_KNOWLEDGE_SPECIFICATION.md')));
  await test('OK-01: serviço existe', () => assert(readSrc('services/aioi/aioiOperationalKnowledgeService.js')));
  await test('OK-02: consolidateOperationalKnowledge', () => assert(typeof knowledge.consolidateOperationalKnowledge === 'function'));

  for (const o of OUTPUTS) {
    await test(`OK-OUT: ${o}`, () => assert(readSrc('services/aioi/aioiOperationalKnowledgeService.js').includes(o)));
  }

  await test('OK-03: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalKnowledgeService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
    assert(!c.includes('INSERT INTO'));
  });

  await test('OK-04: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalKnowledgeService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
