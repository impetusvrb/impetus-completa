/**
 * AIOI-P7 — Enterprise Knowledge Foundation Master Audit
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

const P7_DOCS = [
  'AIOI_OPERATIONAL_KNOWLEDGE_SPECIFICATION.md',
  'AIOI_KNOWLEDGE_CATALOG_SPECIFICATION.md',
  'AIOI_OPERATIONAL_PATTERN_SPECIFICATION.md',
  'AIOI_KNOWLEDGE_MATURITY_SPECIFICATION.md',
  'AIOI_KNOWLEDGE_READINESS_SPECIFICATION.md',
  'AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md'
];

const P7_SERVICES = [
  'aioiOperationalKnowledgeService.js',
  'aioiKnowledgeCatalogService.js',
  'aioiOperationalPatternService.js',
  'aioiEnterpriseKnowledgeReportService.js',
  'aioiKnowledgeMaturityService.js',
  'aioiKnowledgeReadinessService.js'
];

const P7_TESTS = [
  'AioiOperationalKnowledgeAudit.test.js',
  'AioiKnowledgeCatalogAudit.test.js',
  'AioiOperationalPatternAudit.test.js',
  'AioiKnowledgeMaturityAudit.test.js',
  'AioiKnowledgeReadinessAudit.test.js',
  'AioiEnterpriseKnowledgeReportAudit.test.js'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P7 — Enterprise Knowledge Foundation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P7');
  for (const doc of P7_DOCS) {
    await test(`P7-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P7');
  for (const s of P7_SERVICES) {
    await test(`P7-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P7');
  for (const t of P7_TESTS) {
    await test(`P7-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: P1..P6 preservados');
  await test('P7-P6: P6 intacto', () => assert(readDoc('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md').includes('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_CERTIFICATION_PASS')));
  await test('P7-P5: P5 intacto', () => assert(readDoc('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_PASS')));
  await test('P7-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO E: Invariantes + proibições');
  await test('P7-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P7-FORBID: sem LLM nos serviços P7', () => {
    for (const s of P7_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    }
  });
  await test('P7-FORBID: sem auto-learning/weight_versions', () => {
    for (const s of P7_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('weight_version') && !c.includes('auto-learning') && !c.includes('auto_learning'));
    }
  });

  console.log('\n  ── BLOCO F: Tokens');
  await test('P7-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_REPORT.md');
    assert(d.includes('AIOI_P7_ENTERPRISE_KNOWLEDGE_FOUNDATION_CERTIFICATION_PASS'));
    assert(d.includes('OPERATIONAL_KNOWLEDGE_CERTIFIED'));
    assert(d.includes('KNOWLEDGE_CATALOG_CERTIFIED'));
    assert(d.includes('PATTERN_ANALYTICS_CERTIFIED'));
    assert(d.includes('KNOWLEDGE_MATURITY_CERTIFIED'));
    assert(d.includes('KNOWLEDGE_READINESS_VALIDATED'));
    assert(d.includes('ENTERPRISE_KNOWLEDGE_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
