/**
 * AIOI-P5 — Enterprise Rollout Master Audit
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

const P5_DOCS = [
  'AIOI_ENTERPRISE_GOVERNANCE_SPECIFICATION.md',
  'AIOI_ENTERPRISE_READINESS_SPECIFICATION.md',
  'AIOI_AUDIT_TRAIL_SPECIFICATION.md',
  'AIOI_COMPLIANCE_ANALYTICS_SPECIFICATION.md',
  'AIOI_ENTERPRISE_ROLLOUT_GOVERNANCE_CONTRACT.md',
  'AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md'
];

const P5_SERVICES = [
  'aioiEnterpriseGovernanceService.js',
  'aioiEnterpriseReadinessService.js',
  'aioiAuditTrailService.js',
  'aioiComplianceAnalyticsService.js',
  'aioiEnterpriseExecutiveReportService.js'
];

const P5_TESTS = [
  'AioiEnterpriseGovernanceAudit.test.js',
  'AioiEnterpriseReadinessAudit.test.js',
  'AioiAuditTrailAudit.test.js',
  'AioiComplianceAnalyticsAudit.test.js',
  'AioiEnterpriseExecutiveReportAudit.test.js'
];

const RG_RULES = ['RG-01', 'RG-02', 'RG-03', 'RG-04', 'RG-05', 'RG-06', 'RG-07', 'RG-08'];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P5 — Enterprise Rollout Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P5');
  for (const doc of P5_DOCS) {
    await test(`P5-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Rollout Governance Contract RG-*');
  for (const rg of RG_RULES) {
    await test(`P5-RG: ${rg}`, () => assert(readDoc('AIOI_ENTERPRISE_ROLLOUT_GOVERNANCE_CONTRACT.md').includes(rg)));
  }

  console.log('\n  ── BLOCO C: Serviços P5');
  for (const s of P5_SERVICES) {
    await test(`P5-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO D: Testes P5');
  for (const t of P5_TESTS) {
    await test(`P5-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO E: P1..P4 preservados');
  await test('P5-P4: P4 intacto', () => assert(readDoc('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md').includes('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_PASS')));
  await test('P5-P3: P3 intacto', () => assert(readDoc('AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md').includes('AIOI_P3_PRODUCTION_PILOT_VALIDATION_CERTIFICATION_PASS')));
  await test('P5-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P5-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P5-FORBID: sem LLM nos serviços P5', () => {
    for (const s of P5_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P5-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_PASS'));
    assert(d.includes('ENTERPRISE_GOVERNANCE_CERTIFIED'));
    assert(d.includes('ENTERPRISE_READINESS_VALIDATED'));
    assert(d.includes('AUDIT_TRAIL_CERTIFIED'));
    assert(d.includes('COMPLIANCE_ANALYTICS_CERTIFIED'));
    assert(d.includes('ENTERPRISE_REPORTING_CERTIFIED'));
    assert(d.includes('READY_FOR_CONTROLLED_ENTERPRISE_ROLLOUT'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
