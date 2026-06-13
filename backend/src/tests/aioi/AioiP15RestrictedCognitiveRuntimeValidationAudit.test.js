/**
 * AIOI-P15 — Restricted Cognitive Runtime Validation Master Audit
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

const executiveReport = require('../../services/aioi/aioiExecutiveRuntimeValidationReportService');

const P15_DOCS = [
  'AIOI_COGNITIVE_RUNTIME_VALIDATION_SPECIFICATION.md',
  'AIOI_RUNTIME_VALIDATION_CATALOG_SPECIFICATION.md',
  'AIOI_RUNTIME_VALIDATION_EVIDENCE_SPECIFICATION.md',
  'AIOI_RUNTIME_BOUNDARY_SPECIFICATION.md',
  'AIOI_RUNTIME_SAFETY_SPECIFICATION.md',
  'AIOI_RUNTIME_READINESS_SPECIFICATION.md',
  'AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md'
];

const P15_SERVICES = [
  'aioiCognitiveRuntimeValidationService.js',
  'aioiRuntimeValidationCatalogService.js',
  'aioiRuntimeValidationEvidenceService.js',
  'aioiRuntimeBoundaryService.js',
  'aioiRuntimeSafetyService.js',
  'aioiRuntimeReadinessService.js',
  'aioiExecutiveRuntimeValidationReportService.js'
];

const P15_TESTS = [
  'AioiCognitiveRuntimeValidationAudit.test.js',
  'AioiRuntimeValidationCatalogAudit.test.js',
  'AioiRuntimeValidationEvidenceAudit.test.js',
  'AioiRuntimeBoundaryAudit.test.js',
  'AioiRuntimeSafetyAudit.test.js',
  'AioiRuntimeReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'runtime_validation_summary', 'constraint_summary', 'dependency_summary',
  'evidence_summary', 'governance_summary', 'safety_summary', 'runtime_readiness_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P15 — Restricted Cognitive Runtime Validation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P15');
  for (const doc of P15_DOCS) {
    await test(`P15-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P15');
  for (const s of P15_SERVICES) {
    await test(`P15-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P15');
  for (const t of P15_TESTS) {
    await test(`P15-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P15.7');
  await test('P15-REPORT: generateExecutiveRuntimeValidationReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveRuntimeValidationReportService.js').includes('generateExecutiveRuntimeValidationReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P15-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveRuntimeValidationReportService.js').includes(s)));
  }

  await test('P15-REPORT: executa', async () => {
    const r = await executiveReport.generateExecutiveRuntimeValidationReport();
    assert(r.ok);
    for (const s of REPORT_SECTIONS) assert(r[s] !== undefined);
    assert(r.runtime_validation_summary.all_runtime_denied);
    assert.strictEqual(r.runtime_validation_summary.runtime_possible, false);
    assert.strictEqual(r.governance_summary.authorized, false);
  });

  console.log('\n  ── BLOCO E: P1..P14 preservados');
  await test('P15-P14: P14 intacto', () => assert(readDoc('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md').includes('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_CERTIFICATION_PASS')));
  await test('P15-P13: P13 intacto', () => assert(readDoc('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md').includes('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_CERTIFICATION_PASS')));
  await test('P15-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P15-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P15-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P15_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P15-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_REPORT.md');
    assert(d.includes('AIOI_P15_RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_RUNTIME_VALIDATION_CERTIFIED'));
    assert(d.includes('RUNTIME_VALIDATION_CATALOG_CERTIFIED'));
    assert(d.includes('RUNTIME_VALIDATION_EVIDENCE_CERTIFIED'));
    assert(d.includes('RUNTIME_BOUNDARIES_CERTIFIED'));
    assert(d.includes('RUNTIME_SAFETY_CERTIFIED'));
    assert(d.includes('RUNTIME_READINESS_VALIDATED'));
    assert(d.includes('RESTRICTED_COGNITIVE_RUNTIME_VALIDATION_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
