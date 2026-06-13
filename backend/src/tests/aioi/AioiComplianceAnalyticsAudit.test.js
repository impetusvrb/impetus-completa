/**
 * AIOI-P5.4 — Compliance Analytics Audit
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

const analytics = require('../../services/aioi/aioiComplianceAnalyticsService');

const METRICS = [
  'workflow_compliance', 'sla_compliance', 'tenant_compliance',
  'governance_compliance', 'operational_compliance', 'compliance_trends'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P5.4 — Compliance Analytics Audit\n');

  await test('CA-DOC: spec existe', () => assert(readDoc('AIOI_COMPLIANCE_ANALYTICS_SPECIFICATION.md')));
  await test('CA-01: getComplianceAnalytics', () => assert(typeof analytics.getComplianceAnalytics === 'function'));

  for (const m of METRICS) {
    await test(`CA-METRIC: ${m}`, () => assert(readSrc('services/aioi/aioiComplianceAnalyticsService.js').includes(m)));
  }

  await test('CA-02: overall_compliance_score', () => {
    assert(readSrc('services/aioi/aioiComplianceAnalyticsService.js').includes('overall_compliance_score'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
