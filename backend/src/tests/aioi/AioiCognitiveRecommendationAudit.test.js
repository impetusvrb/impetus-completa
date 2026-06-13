/**
 * AIOI-P11.1 — Cognitive Recommendation Audit
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

const recommendation = require('../../services/aioi/aioiCognitiveRecommendationService');

const FIELDS = ['recommendation_id', 'category', 'recommendation_text', 'supporting_observations', 'evidence_chain', 'confidence_level', 'generated_at'];
const CATEGORIES = ['workflow', 'sla', 'risk', 'capacity', 'compliance', 'governance', 'decision'];
const CONFIDENCE = ['LOW', 'MEDIUM', 'HIGH'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P11.1 — Cognitive Recommendation Audit\n');

  await test('CR-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_RECOMMENDATION_SPECIFICATION.md')));
  await test('CR-01: generateStructuredRecommendations', () => assert(typeof recommendation.generateStructuredRecommendations === 'function'));

  for (const f of FIELDS) {
    await test(`CR-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiCognitiveRecommendationService.js').includes(f)));
  }

  for (const c of CATEGORIES) {
    await test(`CR-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiCognitiveRecommendationService.js').includes(`'${c}'`)));
  }

  for (const lvl of CONFIDENCE) {
    await test(`CR-CONF: ${lvl}`, () => assert(readSrc('services/aioi/aioiCognitiveRecommendationService.js').includes(`'${lvl}'`)));
  }

  await test('CR-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiCognitiveRecommendationService.js'));
    assert(!c.includes('UPDATE ') && !c.includes('INSERT INTO'));
  });

  await test('CR-03: não decisão/execução/autorização', () => {
    const c = readSrc('services/aioi/aioiCognitiveRecommendationService.js');
    assert(c.includes('is_decision:              false'));
    assert(c.includes('is_execution:             false'));
    assert(c.includes('is_authorized:              false'));
  });

  await test('CR-04: executa', async () => {
    const r = await recommendation.generateStructuredRecommendations();
    assert(r.recommendation_count >= 6);
    assert(r.analytical_artifact_only);
    const first = r.recommendations[0];
    for (const f of FIELDS) assert(first[f] !== undefined);
    assert(CONFIDENCE.includes(first.confidence_level));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
