/**
 * AIOI-P14 — Controlled Cognitive Simulation Master Audit
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

const executiveReport = require('../../services/aioi/aioiExecutiveSimulationReportService');

const P14_DOCS = [
  'AIOI_COGNITIVE_SIMULATION_SPECIFICATION.md',
  'AIOI_SIMULATION_CATALOG_SPECIFICATION.md',
  'AIOI_SIMULATION_EVIDENCE_SPECIFICATION.md',
  'AIOI_SIMULATION_BOUNDARY_SPECIFICATION.md',
  'AIOI_SIMULATION_SAFETY_SPECIFICATION.md',
  'AIOI_SIMULATION_READINESS_SPECIFICATION.md',
  'AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md'
];

const P14_SERVICES = [
  'aioiCognitiveSimulationService.js',
  'aioiSimulationCatalogService.js',
  'aioiSimulationEvidenceService.js',
  'aioiSimulationBoundaryService.js',
  'aioiSimulationSafetyService.js',
  'aioiSimulationReadinessService.js',
  'aioiExecutiveSimulationReportService.js'
];

const P14_TESTS = [
  'AioiCognitiveSimulationAudit.test.js',
  'AioiSimulationCatalogAudit.test.js',
  'AioiSimulationEvidenceAudit.test.js',
  'AioiSimulationBoundaryAudit.test.js',
  'AioiSimulationSafetyAudit.test.js',
  'AioiSimulationReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'simulation_summary', 'scenario_summary', 'evidence_summary',
  'governance_summary', 'safety_summary', 'simulation_readiness_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P14 — Controlled Cognitive Simulation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P14');
  for (const doc of P14_DOCS) {
    await test(`P14-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P14');
  for (const s of P14_SERVICES) {
    await test(`P14-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P14');
  for (const t of P14_TESTS) {
    await test(`P14-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P14.7');
  await test('P14-REPORT: generateExecutiveSimulationReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveSimulationReportService.js').includes('generateExecutiveSimulationReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P14-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveSimulationReportService.js').includes(s)));
  }

  await test('P14-REPORT: executa', async () => {
    const r = await executiveReport.generateExecutiveSimulationReport();
    assert(r.ok);
    for (const s of REPORT_SECTIONS) assert(r[s] !== undefined);
    assert(r.simulation_summary.no_real_effects);
    assert.strictEqual(r.governance_summary.authorized, false);
  });

  console.log('\n  ── BLOCO E: P1..P13 preservados');
  await test('P14-P13: P13 intacto', () => assert(readDoc('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_REPORT.md').includes('AIOI_P13_COGNITIVE_AUTHORIZATION_MODELING_CERTIFICATION_PASS')));
  await test('P14-P12: P12 intacto', () => assert(readDoc('AIOI_P12_HUMAN_DECISION_ASSISTANCE_REPORT.md').includes('AIOI_P12_HUMAN_DECISION_ASSISTANCE_CERTIFICATION_PASS')));
  await test('P14-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P14-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P14-FORBID: sem LLM/embeddings/ML', () => {
    for (const s of P14_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('vector database'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P14-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_REPORT.md');
    assert(d.includes('AIOI_P14_CONTROLLED_COGNITIVE_SIMULATION_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_SIMULATION_CERTIFIED'));
    assert(d.includes('SIMULATION_CATALOG_CERTIFIED'));
    assert(d.includes('SIMULATION_EVIDENCE_CERTIFIED'));
    assert(d.includes('SIMULATION_BOUNDARIES_CERTIFIED'));
    assert(d.includes('SIMULATION_SAFETY_CERTIFIED'));
    assert(d.includes('SIMULATION_READINESS_VALIDATED'));
    assert(d.includes('CONTROLLED_COGNITIVE_SIMULATION_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
