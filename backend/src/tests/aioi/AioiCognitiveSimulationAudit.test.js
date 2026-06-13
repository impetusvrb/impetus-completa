/**
 * AIOI-P14.1 — Cognitive Simulation Audit
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

const simulation = require('../../services/aioi/aioiCognitiveSimulationService');

const FIELDS = ['simulation_id', 'category', 'scenario_description', 'simulated_inputs', 'simulated_outcomes', 'simulation_scope', 'generated_at'];
const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.1 — Cognitive Simulation Audit\n');

  await test('CS-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_SIMULATION_SPECIFICATION.md')));
  await test('CS-01: generateControlledSimulations', () => assert(typeof simulation.generateControlledSimulations === 'function'));

  for (const f of FIELDS) {
    await test(`CS-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveSimulationService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`CS-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveSimulationService.js').includes(`'${c}'`)));
  }

  await test('CS-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveSimulationService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('CS-03: isolada e sem efeitos reais', () => {
    const c = readSrc('services/aioi/aioiCognitiveSimulationService.js');
    assert(c.includes('ISOLATED_HYPOTHETICAL'));
    assert(c.includes('produces_real_effects: false'));
  });

  await test('CS-04: executa', async () => {
    const r = await simulation.generateControlledSimulations();
    assert.strictEqual(r.simulation_count, 7);
    assert(r.all_isolated);
    assert(r.no_real_effects);
    const first = r.simulations[0];
    for (const f of FIELDS) assert(first[f] !== undefined);
    assert.strictEqual(first.simulation_scope, 'ISOLATED_HYPOTHETICAL');
    assert.strictEqual(first.produces_real_effects, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
