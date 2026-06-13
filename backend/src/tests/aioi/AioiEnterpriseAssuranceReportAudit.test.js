/**
 * AIOI-P6.4 — Enterprise Assurance Report Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }

const report = require('../../services/aioi/aioiEnterpriseAssuranceReportService');

const SECTIONS = [
  'governance_assurance_summary', 'certification_assurance_summary',
  'operational_assurance_summary', 'compliance_assurance_summary',
  'longitudinal_analysis_summary', 'enterprise_assurance_recommendation'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.4 — Enterprise Assurance Report Audit\n');

  await test('AR-01: generateEnterpriseAssuranceReport', () => assert(typeof report.generateEnterpriseAssuranceReport === 'function'));

  for (const s of SECTIONS) {
    await test(`AR-SECTION: ${s}`, () => assert(readSrc('services/aioi/aioiEnterpriseAssuranceReportService.js').includes(s)));
  }

  await test('AR-02: recommendation values', () => {
    const c = readSrc('services/aioi/aioiEnterpriseAssuranceReportService.js');
    assert(c.includes('CONTINUE_CONTROLLED_ENTERPRISE_ROLLOUT'));
    assert(c.includes('ESCALATE_GOVERNANCE_REVIEW'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
