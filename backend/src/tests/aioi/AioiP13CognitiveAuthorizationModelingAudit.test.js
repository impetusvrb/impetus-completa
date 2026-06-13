/**
 * AIOI-P13 — Cognitive Authorization Modeling Master Audit
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

const executiveReport = require('../../services/aioi/aioiExecutiveAuthorizationReportService');

const P13_DOCS = [
  'AIOI_COGNITIVE_AUTHORIZATION_MODELING_SPECIFICATION.md',
  'AIOI_AUTHORIZATION_CATALOG_SPECIFICATION.md',
  'AIOI_AUTHORIZATION_EVIDENCE_SPECIFICATION.md',
  'AIOI_AUTHORIZATION_BOUNDARY_SPECIFICATION.md',
  'AIOI_AUTHORIZATION_SAFETY_SPECIFICATION.md',
  'AIOI_AUTHORIZATION_READINESS_SPECIFICATION.md',
  'AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md'
];

const P13_SERVICES = [
  'aioiCognitiveAuthorizationModelingService.js',
  'aioiAuthorizationCatalogService.js',
  'aioiAuthorizationEvidenceService.js',
  'aioiAuthorizationBoundaryService.js',
  'aioiAuthorizationSafetyService.js',
  'aioiAuthorizationReadinessService.js',
  'aioiExecutiveAuthorizationReportService.js'
];

const P13_TESTS = [
  'AioiCognitiveAuthorizationModelingAudit.test.js',
  'AioiAuthorizationCatalogAudit.test.js',
  'AioiAuthorizationEvidenceAudit.test.js',
  'AioiAuthorizationBoundaryAudit.test.js',
  'AioiAuthorizationSafetyAudit.test.js',
  'AioiAuthorizationReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'authorization_modeling_summary', 'authorization_control_summary', 'evidence_summary',
  'governance_summary', 'safety_summary', 'authorization_readiness_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P13 — Cognitive Authorization Modeling Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P13');
  for (const doc of P13_DOCS) {
    await test(`P13-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P13');
  for (const s of P13_SERVICES) {
    await test(`P13-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P13');
  for (const t of P13_TESTS) {
    await test(`P13-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P13.7');
  await test('P13-REPORT: generateExecutiveAuthorizationReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveAuthorizationReportService.js').includes('generateExecutiveAuthorizationReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P13-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveAuthorizationReportService.js').includes(s)));
  }

  await test('P13-REPORT: executa', async () => {
    const r = await executiveReport.generateExecutiveAuthorizationReport();
    assert(r.ok);
    for (const s of REPORT_SECTIONS) assert(r[s] !== undefined);
    assert(r.authorization_modeling_summary.all_authorization_denied);
    assert.strictEqual(r.governance_summary.authorized, false);
  });

  console.log('\n  ── BLOCO E: P1..P12 preservados');
  await test('P13-P12: P12 intacto', () => assert(readDoc('AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md').includes('AIOI_P12_HUMAN_DECISION_ASSISTANCE_CERTIFICATION_PASS')));
  await test('P13-P11: P11 intacto', () => assert(readDoc('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_REPORT.md').includes('AIOI_P11_CONTROLLED_COGNITIVE_RECOMMENDATION_CERTIFICATION_PASS')));
  await test('P13-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P13-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P13-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P13_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P13-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md');
    assert(d.includes('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_AUTHORIZATION_MODELING_CERTIFIED'));
    assert(d.includes('AUTHORIZATION_CATALOG_CERTIFIED'));
    assert(d.includes('AUTHORIZATION_EVIDENCE_CERTIFIED'));
    assert(d.includes('AUTHORIZATION_BOUNDARIES_CERTIFIED'));
    assert(d.includes('AUTHORIZATION_SAFETY_CERTIFIED'));
    assert(d.includes('AUTHORIZATION_READINESS_VALIDATED'));
    assert(d.includes('COGNITIVE_AUTHORIZATION_MODELING_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
