/**
 * AIOI-P10 — Cognitive Observation Framework Master Audit
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

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const P10_DOCS = [
  'AIOI_COGNITIVE_OBSERVATION_SPECIFICATION.md',
  'AIOI_OBSERVATION_CATALOG_SPECIFICATION.md',
  'AIOI_OBSERVATION_EVIDENCE_SPECIFICATION.md',
  'AIOI_OBSERVATION_CONSISTENCY_SPECIFICATION.md',
  'AIOI_OBSERVATION_SAFETY_SPECIFICATION.md',
  'AIOI_OBSERVATION_READINESS_SPECIFICATION.md',
  'AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md'
];

const P10_SERVICES = [
  'aioiCognitiveObservationService.js',
  'aioiObservationCatalogService.js',
  'aioiObservationEvidenceService.js',
  'aioiObservationConsistencyService.js',
  'aioiObservationSafetyService.js',
  'aioiObservationReadinessService.js',
  'aioiExecutiveObservationReportService.js'
];

const P10_TESTS = [
  'AioiCognitiveObservationAudit.test.js',
  'AioiObservationCatalogAudit.test.js',
  'AioiObservationEvidenceAudit.test.js',
  'AioiObservationConsistencyAudit.test.js',
  'AioiObservationSafetyAudit.test.js',
  'AioiObservationReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'observation_summary', 'evidence_summary', 'consistency_summary',
  'governance_summary', 'safety_summary', 'observation_readiness_summary'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P10 — Cognitive Observation Framework Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P10');
  for (const doc of P10_DOCS) {
    await test(`P10-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P10');
  for (const s of P10_SERVICES) {
    await test(`P10-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P10');
  for (const t of P10_TESTS) {
    await test(`P10-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P10.7');
  await test('P10-REPORT: generateExecutiveObservationReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveObservationReportService.js').includes('generateExecutiveObservationReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P10-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveObservationReportService.js').includes(s)));
  }

  console.log('\n  ── BLOCO E: P1..P9 preservados');
  await test('P10-P9: P9 intacto', () => assert(readDoc('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md').includes('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_CERTIFICATION_PASS')));
  await test('P10-P8: P8 intacto', () => assert(readDoc('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md').includes('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_CERTIFICATION_PASS')));
  await test('P10-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P10-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P10-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P10_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P10-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md');
    assert(d.includes('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_OBSERVATION_CERTIFIED'));
    assert(d.includes('OBSERVATION_CATALOG_CERTIFIED'));
    assert(d.includes('OBSERVATION_EVIDENCE_CERTIFIED'));
    assert(d.includes('OBSERVATION_CONSISTENCY_CERTIFIED'));
    assert(d.includes('OBSERVATION_SAFETY_CERTIFIED'));
    assert(d.includes('OBSERVATION_READINESS_VALIDATED'));
    assert(d.includes('COGNITIVE_OBSERVATION_FRAMEWORK_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
