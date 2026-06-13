/**
 * AIOI-P12 — Human Decision Assistance Master Audit
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

const executiveReport = require('../../services/aioi/aioiExecutiveHumanDecisionReportService');

const P12_DOCS = [
  'AIOI_HUMAN_DECISION_ASSISTANCE_SPECIFICATION.md',
  'AIOI_DECISION_REVIEW_CATALOG_SPECIFICATION.md',
  'AIOI_HUMAN_REVIEW_EVIDENCE_SPECIFICATION.md',
  'AIOI_HUMAN_AUTHORITY_BOUNDARY_SPECIFICATION.md',
  'AIOI_HUMAN_REVIEW_SAFETY_SPECIFICATION.md',
  'AIOI_HUMAN_DECISION_READINESS_SPECIFICATION.md',
  'AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md'
];

const P12_SERVICES = [
  'aioiHumanDecisionAssistanceService.js',
  'aioiDecisionReviewCatalogService.js',
  'aioiHumanReviewEvidenceService.js',
  'aioiHumanAuthorityBoundaryService.js',
  'aioiHumanReviewSafetyService.js',
  'aioiHumanDecisionReadinessService.js',
  'aioiExecutiveHumanDecisionReportService.js'
];

const P12_TESTS = [
  'AioiHumanDecisionAssistanceAudit.test.js',
  'AioiDecisionReviewCatalogAudit.test.js',
  'AioiHumanReviewEvidenceAudit.test.js',
  'AioiHumanAuthorityBoundaryAudit.test.js',
  'AioiHumanReviewSafetyAudit.test.js',
  'AioiHumanDecisionReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'human_decision_summary', 'review_queue_summary', 'recommendation_summary',
  'evidence_summary', 'governance_summary', 'human_decision_readiness_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P12 — Human Decision Assistance Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P12');
  for (const doc of P12_DOCS) {
    await test(`P12-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P12');
  for (const s of P12_SERVICES) {
    await test(`P12-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P12');
  for (const t of P12_TESTS) {
    await test(`P12-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P12.7');
  await test('P12-REPORT: generateExecutiveHumanDecisionReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveHumanDecisionReportService.js').includes('generateExecutiveHumanDecisionReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P12-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveHumanDecisionReportService.js').includes(s)));
  }

  await test('P12-REPORT: executa', async () => {
    const r = await executiveReport.generateExecutiveHumanDecisionReport();
    assert(r.ok);
    for (const s of REPORT_SECTIONS) assert(r[s] !== undefined);
    assert(r.human_decision_summary.human_in_the_loop);
    assert(r.review_queue_summary.pending_human_review >= 6);
  });

  console.log('\n  ── BLOCO E: P1..P11 preservados');
  await test('P12-P11: P11 intacto', () => assert(readDoc('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md').includes('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_CERTIFICATION_PASS')));
  await test('P12-P10: P10 intacto', () => assert(readDoc('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_REPORT.md').includes('AIOI_P10_COGNITIVE_OBSERVATION_FRAMEWORK_CERTIFICATION_PASS')));
  await test('P12-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P12-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P12-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P12_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P12-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md');
    assert(d.includes('AIOI_P12_HUMAN_DECISION_ASSISTANCE_CERTIFICATION_PASS'));
    assert(d.includes('HUMAN_DECISION_ASSISTANCE_CERTIFIED'));
    assert(d.includes('DECISION_REVIEW_CATALOG_CERTIFIED'));
    assert(d.includes('HUMAN_REVIEW_EVIDENCE_CERTIFIED'));
    assert(d.includes('HUMAN_AUTHORITY_BOUNDARIES_CERTIFIED'));
    assert(d.includes('HUMAN_REVIEW_SAFETY_CERTIFIED'));
    assert(d.includes('HUMAN_DECISION_READINESS_VALIDATED'));
    assert(d.includes('HUMAN_DECISION_ASSISTANCE_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
