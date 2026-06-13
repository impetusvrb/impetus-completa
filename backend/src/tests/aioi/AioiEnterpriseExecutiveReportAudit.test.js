/**
 * AIOI-P5.5 — Enterprise Executive Report Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }

const report = require('../../services/aioi/aioiEnterpriseExecutiveReportService');

const SECTIONS = [
  'enterprise_governance_summary',
  'enterprise_compliance_summary',
  'enterprise_stability_summary',
  'enterprise_scalability_summary',
  'enterprise_risk_summary',
  'enterprise_rollout_recommendation'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P5.5 — Enterprise Executive Report Audit\n');

  await test('ER-01: generateEnterpriseExecutiveReport', () => {
    assert(typeof report.generateEnterpriseExecutiveReport === 'function');
  });

  for (const s of SECTIONS) {
    await test(`ER-SECTION: ${s}`, () => assert(readSrc('services/aioi/aioiEnterpriseExecutiveReportService.js').includes(s)));
  }

  await test('ER-02: rollout recommendation values', () => {
    const c = readSrc('services/aioi/aioiEnterpriseExecutiveReportService.js');
    assert(c.includes('PROCEED_CONTROLLED_ROLLOUT'));
    assert(c.includes('runtime_cognitive'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
