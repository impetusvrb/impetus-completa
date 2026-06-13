/**
 * AIOI-P6 — Continuous Governance Assurance Master Audit
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

const P6_DOCS = [
  'AIOI_GOVERNANCE_ASSURANCE_SPECIFICATION.md',
  'AIOI_CERTIFICATION_DRIFT_SPECIFICATION.md',
  'AIOI_LONGITUDINAL_ANALYTICS_SPECIFICATION.md',
  'AIOI_OPERATIONAL_RISK_REGISTER_SPECIFICATION.md',
  'AIOI_CONTINUOUS_CERTIFICATION_READINESS_SPECIFICATION.md',
  'AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md'
];

const P6_SERVICES = [
  'aioiGovernanceAssuranceService.js',
  'aioiCertificationDriftService.js',
  'aioiLongitudinalAnalyticsService.js',
  'aioiEnterpriseAssuranceReportService.js',
  'aioiOperationalRiskRegisterService.js',
  'aioiContinuousCertificationReadinessService.js'
];

const P6_TESTS = [
  'AioiGovernanceAssuranceAudit.test.js',
  'AioiCertificationDriftAudit.test.js',
  'AioiLongitudinalAnalyticsAudit.test.js',
  'AioiOperationalRiskRegisterAudit.test.js',
  'AioiContinuousCertificationReadinessAudit.test.js',
  'AioiEnterpriseAssuranceReportAudit.test.js'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P6 — Continuous Governance Assurance Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P6');
  for (const doc of P6_DOCS) {
    await test(`P6-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P6');
  for (const s of P6_SERVICES) {
    await test(`P6-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P6');
  for (const t of P6_TESTS) {
    await test(`P6-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: P1..P5 preservados');
  await test('P6-P5: P5 intacto', () => assert(readDoc('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P5_ENTERPRISE_ROLLOUT_CERTIFICATION_PASS')));
  await test('P6-P4: P4 intacto', () => assert(readDoc('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md').includes('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_PASS')));
  await test('P6-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO E: Invariantes + proibições');
  await test('P6-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P6-FORBID: sem LLM nos serviços P6', () => {
    for (const s of P6_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'));
    }
  });

  console.log('\n  ── BLOCO F: Tokens');
  await test('P6-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_REPORT.md');
    assert(d.includes('AIOI_P6_CONTINUOUS_GOVERNANCE_ASSURANCE_CERTIFICATION_PASS'));
    assert(d.includes('GOVERNANCE_ASSURANCE_CERTIFIED'));
    assert(d.includes('CERTIFICATION_DRIFT_MONITORED'));
    assert(d.includes('LONGITUDINAL_ANALYTICS_CERTIFIED'));
    assert(d.includes('RISK_REGISTER_CERTIFIED'));
    assert(d.includes('CONTINUOUS_READINESS_VALIDATED'));
    assert(d.includes('ENTERPRISE_ASSURANCE_ESTABLISHED'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
