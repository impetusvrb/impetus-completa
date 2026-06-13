/**
 * AIOI-P7.4 — Enterprise Knowledge Report Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }

const report = require('../../services/aioi/aioiEnterpriseKnowledgeReportService');

const SECTIONS = [
  'knowledge_summary', 'operational_pattern_summary', 'outcome_summary',
  'sla_knowledge_summary', 'risk_knowledge_summary', 'enterprise_knowledge_recommendation'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.4 — Enterprise Knowledge Report Audit\n');

  await test('EKR-01: generateEnterpriseKnowledgeReport', () => assert(typeof report.generateEnterpriseKnowledgeReport === 'function'));

  for (const s of SECTIONS) {
    await test(`EKR-SECTION: ${s}`, () => assert(readSrc('services/aioi/aioiEnterpriseKnowledgeReportService.js').includes(s)));
  }

  await test('EKR-02: recommendation values', () => {
    const c = readSrc('services/aioi/aioiEnterpriseKnowledgeReportService.js');
    assert(c.includes('KNOWLEDGE_FOUNDATION_READY'));
    assert(c.includes('ACCUMULATE_OPERATIONAL_EVIDENCE'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
