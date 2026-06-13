/**
 * AIOI-P11 — Controlled Cognitive Recommendation Master Audit
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

const executiveReport = require('../../services/aioi/aioiExecutiveRecommendationReportService');

const P11_DOCS = [
  'AIOI_COGNITIVE_RECOMMENDATION_SPECIFICATION.md',
  'AIOI_RECOMMENDATION_CATALOG_SPECIFICATION.md',
  'AIOI_RECOMMENDATION_EVIDENCE_SPECIFICATION.md',
  'AIOI_RECOMMENDATION_BOUNDARY_SPECIFICATION.md',
  'AIOI_RECOMMENDATION_SAFETY_SPECIFICATION.md',
  'AIOI_RECOMMENDATION_READINESS_SPECIFICATION.md',
  'AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md'
];

const P11_SERVICES = [
  'aioiCognitiveRecommendationService.js',
  'aioiRecommendationCatalogService.js',
  'aioiRecommendationEvidenceService.js',
  'aioiRecommendationBoundaryService.js',
  'aioiRecommendationSafetyService.js',
  'aioiRecommendationReadinessService.js',
  'aioiExecutiveRecommendationReportService.js'
];

const P11_TESTS = [
  'AioiCognitiveRecommendationAudit.test.js',
  'AioiRecommendationCatalogAudit.test.js',
  'AioiRecommendationEvidenceAudit.test.js',
  'AioiRecommendationBoundaryAudit.test.js',
  'AioiRecommendationSafetyAudit.test.js',
  'AioiRecommendationReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'recommendation_summary', 'evidence_summary', 'boundary_summary',
  'safety_summary', 'governance_summary', 'recommendation_readiness_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P11 — Controlled Cognitive Recommendation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P11');
  for (const doc of P11_DOCS) {
    await test(`P11-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P11');
  for (const s of P11_SERVICES) {
    await test(`P11-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P11');
  for (const t of P11_TESTS) {
    await test(`P11-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P11.7');
  await test('P11-REPORT: generateExecutiveRecommendationReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveRecommendationReportService.js').includes('generateExecutiveRecommendationReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P11-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveRecommendationReportService.js').includes(s)));
  }

  await test('P11-REPORT: executa', async () => {
    const r = await executiveReport.generateExecutiveRecommendationReport();
    assert(r.ok);
    for (const s of REPORT_SECTIONS) assert(r[s] !== undefined);
    assert(r.recommendation_summary.analytical_artifact_only);
  });

  console.log('\n  ── BLOCO E: P1..P10 preservados');
  await test('P11-P10: P10 intacto', () => assert(readDoc('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md').includes('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_CERTIFICATION_PASS')));
  await test('P11-P9: P9 intacto', () => assert(readDoc('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md').includes('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_CERTIFICATION_PASS')));
  await test('P11-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P11-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P11-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P11_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P11-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md');
    assert(d.includes('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_RECOMMENDATION_CERTIFIED'));
    assert(d.includes('RECOMMENDATION_CATALOG_CERTIFIED'));
    assert(d.includes('RECOMMENDATION_EVIDENCE_CERTIFIED'));
    assert(d.includes('RECOMMENDATION_BOUNDARIES_CERTIFIED'));
    assert(d.includes('RECOMMENDATION_SAFETY_CERTIFIED'));
    assert(d.includes('RECOMMENDATION_READINESS_VALIDATED'));
    assert(d.includes('CONTROLLED_COGNITIVE_RECOMMENDATION_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
