/**
 * AIOI-P4 — Multi-Tenant Scale Master Audit
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

const P4_DOCS = [
  'AIOI_MULTI_TENANT_CAPACITY_SPECIFICATION.md',
  'AIOI_SCALABILITY_VALIDATION_CONTRACT.md',
  'AIOI_GOVERNANCE_DRIFT_SPECIFICATION.md',
  'AIOI_OPERATIONAL_TRENDS_SPECIFICATION.md',
  'AIOI_EXTENDED_PILOT_READINESS_SPECIFICATION.md',
  'AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md'
];

const P4_SERVICES = [
  'aioiTenantCapacityService.js',
  'aioiScalabilityValidationService.js',
  'aioiGovernanceDriftService.js',
  'aioiOperationalTrendService.js',
  'aioiExecutiveScaleReportService.js',
  'aioiExtendedPilotReadinessService.js'
];

const P4_TESTS = [
  'AioiTenantCapacityAudit.test.js',
  'AioiScalabilityValidationAudit.test.js',
  'AioiGovernanceDriftAudit.test.js',
  'AioiOperationalTrendAudit.test.js',
  'AioiExtendedPilotReadinessAudit.test.js'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P4 — Multi-Tenant Scale Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P4');
  for (const doc of P4_DOCS) {
    await test(`P4-DOC: ${doc}`, () => assert(readDoc(doc) && readDoc(doc).length > 100));
  }

  console.log('\n  ── BLOCO B: Serviços P4');
  for (const s of P4_SERVICES) {
    await test(`P4-SVC: ${s}`, () => assert(readSrc(`services/aioi/${s}`)));
  }

  console.log('\n  ── BLOCO C: Testes P4');
  for (const t of P4_TESTS) {
    await test(`P4-TEST: ${t}`, () => assert(fs.existsSync(path.join(__dirname, t))));
  }

  console.log('\n  ── BLOCO D: P1/P2/P3 preservados');
  await test('P4-P1: P1 intacto', () => assert(readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md').includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS')));
  await test('P4-P2: P2 intacto', () => assert(readDoc('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md').includes('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_PASS')));
  await test('P4-P3: P3 intacto', () => assert(readDoc('AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md').includes('AIOI_P3_PRODUCTION_PILOT_VALIDATION_CERTIFICATION_PASS')));

  console.log('\n  ── BLOCO E: Executive Scale Report');
  await test('P4-CEO: generateExecutiveScaleReport', () => {
    const svc = require('../../services/aioi/aioiExecutiveScaleReportService');
    assert(typeof svc.generateExecutiveScaleReport === 'function');
    const c = readSrc('services/aioi/aioiExecutiveScaleReportService.js');
    assert(c.includes('capacity_summary'));
    assert(c.includes('executive_scale_readiness_summary'));
  });

  console.log('\n  ── BLOCO F: Invariantes + proibições');
  await test('P4-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(fs.readFileSync(fp, 'utf8')));
    }
  });
  await test('P4-FORBID: sem LLM/rerank P4', () => {
    const EXCLUDE_DRIFT_DETECTOR = ['aioiGovernanceDriftService.js'];
    for (const s of P4_SERVICES) {
      if (EXCLUDE_DRIFT_DETECTOR.includes(s)) continue;
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('rerank'));
    }
  });

  console.log('\n  ── BLOCO G: Tokens');
  await test('P4-TOKEN: relatório final', () => {
    const d = readDoc('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P4_MULTI_TENANT_SCALE_CERTIFICATION_PASS'));
    assert(d.includes('TENANT_CAPACITY_CERTIFIED'));
    assert(d.includes('SCALABILITY_VALIDATED'));
    assert(d.includes('GOVERNANCE_DRIFT_MONITORED'));
    assert(d.includes('OPERATIONAL_TRENDS_CERTIFIED'));
    assert(d.includes('EXTENDED_PILOT_READY'));
    assert(d.includes('READY_FOR_ENTERPRISE_EXPANSION'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
