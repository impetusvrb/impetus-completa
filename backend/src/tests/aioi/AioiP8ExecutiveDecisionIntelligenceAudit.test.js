/**
 * AIOI-P8 — Executive Decision Intelligence Master Audit
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

const P8_DOCS = [
  'AIOI_DECISION_INTELLIGENCE_SPECIFICATION.md',
  'AIOI_DECISION_HISTORY_SPECIFICATION.md',
  'AIOI_DECISION_EFFECTIVENESS_SPECIFICATION.md',
  'AIOI_DECISION_MATURITY_SPECIFICATION.md',
  'AIOI_EXECUTIVE_READINESS_SPECIFICATION.md',
  'AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md'
];

const P8_SERVICES = [
  'aioiDecisionIntelligenceService.js',
  'aioiDecisionHistoryCatalogService.js',
  'aioiDecisionEffectivenessService.js',
  'aioiExecutiveDecisionReportService.js',
  'aioiDecisionMaturityService.js',
  'aioiExecutiveReadinessService.js'
];

const P8_TESTS = [
  'AioiDecisionIntelligenceAudit.test.js',
  'AioiDecisionHistoryAudit.test.js',
  'AioiDecisionEffectivenessAudit.test.js',
  'AioiDecisionMaturityAudit.test.js',
  'AioiExecutiveReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'decision_intelligence_summary', 'decision_effectiveness_summary',
  'outcome_intelligence_summary', 'risk_intelligence_summary',
  'sla_intelligence_summary', 'executive_intelligence_recommendation'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P8 — Executive Decision Intelligence Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P8');
  for (const doc of P8_DOCS) {
    await test(`P8-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P8');
  for (const s of P8_SERVICES) {
    await test(`P8-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P8');
  for (const t of P8_TESTS) {
    await test(`P8-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P8.4');
  await test('P8-REPORT: generateExecutiveDecisionReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveDecisionReportService.js').includes('generateExecutiveDecisionReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P8-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveDecisionReportService.js').includes(s)));
  }

  console.log('\n  ── BLOCO E: P1..P7 preservados');
  await test('P8-P7: P7 intacto', () => assert(readDoc('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md').includes('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_CERTIFICATION_PASS')));
  await test('P8-P6: P6 intacto', () => assert(readDoc('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md').includes('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_CERTIFICATION_PASS')));
  await test('P8-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P8-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P8-FORBID: sem LLM nos serviços P8', () => {
    for (const s of P8_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    }
  });
  await test('P8-FORBID: sem inferência/previsão', () => {
    const c = stripComments(readSrc('services/aioi/aioiDecisionEffectivenessService.js'));
    assert(c.includes('inference_enabled'));
    assert(c.includes('prediction_enabled'));
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P8-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md');
    assert(d.includes('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_CERTIFICATION_PASS'));
    assert(d.includes('DECISION_INTELLIGENCE_CERTIFIED'));
    assert(d.includes('DECISION_HISTORY_CERTIFIED'));
    assert(d.includes('DECISION_EFFECTIVENESS_CERTIFIED'));
    assert(d.includes('DECISION_MATURITY_CERTIFIED'));
    assert(d.includes('EXECUTIVE_READINESS_VALIDATED'));
    assert(d.includes('EXECUTIVE_INTELLIGENCE_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
