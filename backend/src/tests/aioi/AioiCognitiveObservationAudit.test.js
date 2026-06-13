/**
 * AIOI-P10.1 — Cognitive Observation Audit
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

const observation = require('../../services/aioi/aioiCognitiveObservationService');

const FIELDS = ['observation_id', 'category', 'source_domains', 'observation_text', 'evidence_sources'];
const CATEGORIES = ['throughput', 'sla', 'risk', 'compliance', 'decision', 'capacity'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.1 — Cognitive Observation Audit\n');

  await test('CO-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_OBSERVATION_SPECIFICATION.md')));
  await test('CO-01: generateStructuredObservations', () => assert(typeof observation.generateStructuredObservations === 'function'));

  for (const f of FIELDS) {
    await test(`CO-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveObservationService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`CO-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveObservationService.js').includes(`'${c}'`)));
  }

  await test('CO-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveObservationService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('CO-03: executa', async () => {
    const r = await observation.generateStructuredObservations();
    assert(r.observation_count >= 6);
    assert(r.interpretation_free);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
