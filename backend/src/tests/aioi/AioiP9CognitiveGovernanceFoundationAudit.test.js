/**
 * AIOI-P9 — Cognitive Governance Foundation Master Audit
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

const P9_DOCS = [
  'AIOI_COGNITIVE_AUTHORITY_SPECIFICATION.md',
  'AIOI_COGNITIVE_BOUNDARY_SPECIFICATION.md',
  'AIOI_COGNITIVE_AUTHORIZATION_SPECIFICATION.md',
  'AIOI_COGNITIVE_AUDIT_SPECIFICATION.md',
  'AIOI_COGNITIVE_SAFETY_SPECIFICATION.md',
  'AIOI_COGNITIVE_READINESS_SPECIFICATION.md',
  'AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md'
];

const P9_SERVICES = [
  'aioiCognitiveAuthorityRegistryService.js',
  'aioiCognitiveBoundaryService.js',
  'aioiCognitiveAuthorizationService.js',
  'aioiCognitiveAuditService.js',
  'aioiCognitiveSafetyService.js',
  'aioiCognitiveReadinessService.js',
  'aioiExecutiveCognitiveGovernanceReportService.js'
];

const P9_TESTS = [
  'AioiCognitiveAuthorityAudit.test.js',
  'AioiCognitiveBoundaryAudit.test.js',
  'AioiCognitiveAuthorizationAudit.test.js',
  'AioiCognitiveAuditAudit.test.js',
  'AioiCognitiveSafetyAudit.test.js',
  'AioiCognitiveReadinessAudit.test.js'
];

const REPORT_SECTIONS = [
  'cognitive_authority_summary', 'boundary_summary', 'authorization_summary',
  'audit_readiness_summary', 'safety_summary', 'governance_recommendation'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P9 — Cognitive Governance Foundation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P9');
  for (const doc of P9_DOCS) {
    await test(`P9-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P9');
  for (const s of P9_SERVICES) {
    await test(`P9-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P9');
  for (const t of P9_TESTS) {
    await test(`P9-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: Executive Report P9.7');
  await test('P9-REPORT: generateExecutiveCognitiveGovernanceReport', () => {
    assert(readSrc('services/aioi/aioiExecutiveCognitiveGovernanceReportService.js').includes('generateExecutiveCognitiveGovernanceReport'));
  });
  for (const s of REPORT_SECTIONS) {
    await test(`P9-REPORT-SEC: ${s}`, () => assert(readSrc('services/aioi/aioiExecutiveCognitiveGovernanceReportService.js').includes(s)));
  }

  console.log('\n  ── BLOCO E: P1..P8 preservados');
  await test('P9-P8: P8 intacto', () => assert(readDoc('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_REPORT.md').includes('AIOI_P8_EXECUTIVE_DECISION_INTELLIGENCE_CERTIFICATION_PASS')));
  await test('P9-P7: P7 intacto', () => assert(readDoc('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md').includes('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_CERTIFICATION_PASS')));
  await test('P9-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P9-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P9-FORBID: sem LLM nos serviços P9', () => {
    for (const s of P9_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic') && !c.includes('claude'));
    }
  });
  await test('P9-FORBID: sem embeddings/vector/auto-learning', () => {
    for (const s of P9_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('embedding') && !c.includes('pinecone') && !c.includes('auto_learning'));
    }
  });
  await test('P9-AUTH: autorização NONE', () => {
    const auth = require('../../services/aioi/aioiCognitiveAuthorizationService');
    const s = auth.getAuthorizationState();
    assert.strictEqual(s.authorized, false);
    assert.strictEqual(s.level, 'NONE');
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P9-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_REPORT.md');
    assert(d.includes('AIOI_P9_COGNITIVE_GOVERNANCE_FOUNDATION_CERTIFICATION_PASS'));
    assert(d.includes('COGNITIVE_AUTHORITY_CERTIFIED'));
    assert(d.includes('COGNITIVE_BOUNDARIES_CERTIFIED'));
    assert(d.includes('COGNITIVE_AUTHORIZATION_CERTIFIED'));
    assert(d.includes('COGNITIVE_AUDIT_CERTIFIED'));
    assert(d.includes('COGNITIVE_SAFETY_CERTIFIED'));
    assert(d.includes('COGNITIVE_READINESS_VALIDATED'));
    assert(d.includes('COGNITIVE_GOVERNANCE_FOUNDATION_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
