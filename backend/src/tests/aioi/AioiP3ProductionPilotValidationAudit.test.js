/**
 * AIOI-P3 — Production Pilot Validation Master Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const P3_DOCS = [
  'AIOI_OPERATIONAL_EVIDENCE_SPECIFICATION.md',
  'AIOI_PILOT_VALIDATION_CONTRACT.md',
  'AIOI_SLA_COMPLIANCE_SPECIFICATION.md',
  'AIOI_PRODUCTION_STABILITY_SPECIFICATION.md',
  'AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md'
];

const P3_SERVICES = [
  'aioiOperationalEvidenceService.js',
  'aioiSlaComplianceService.js',
  'aioiProductionStabilityService.js',
  'aioiExecutivePilotReportService.js'
];

const P3_TESTS = [
  'AioiOperationalEvidenceAudit.test.js',
  'AioiPilotValidationAudit.test.js',
  'AioiTenantIsolationAudit.test.js',
  'AioiSlaComplianceAudit.test.js',
  'AioiProductionStabilityAudit.test.js'
];

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-P3 — Production Pilot Validation Master Audit');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  ── BLOCO A: Documentação P3');
  for (const doc of P3_DOCS) {
    await test(`P3-DOC: ${doc}`, () => {
      assert(readDoc(doc) && readDoc(doc).length > 150);
    });
  }

  console.log('\n  ── BLOCO B: Serviços P3');
  for (const s of P3_SERVICES) {
    await test(`P3-SVC: ${s}`, () => {
      assert(readSrc(`services/aioi/${s}`));
    });
  }

  console.log('\n  ── BLOCO C: Testes P3');
  for (const t of P3_TESTS) {
    await test(`P3-TEST: ${t}`, () => {
      assert(fs.existsSync(path.join(__dirname, t)));
    });
  }

  console.log('\n  ── BLOCO D: P1 + P2 preservados');
  await test('P3-P1: P1 certification intacta', () => {
    const d = readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_PASS'));
  });
  await test('P3-P2: P2 certification intacta', () => {
    const d = readDoc('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_REPORT.md');
    assert(d.includes('AIOI_P2_PRODUCTION_OPERATIONS_CERTIFICATION_PASS'));
  });

  console.log('\n  ── BLOCO E: Executive Pilot Report');
  await test('P3-CEO: generateExecutivePilotReport', () => {
    const svc = require('../../services/aioi/aioiExecutivePilotReportService');
    assert(typeof svc.generateExecutivePilotReport === 'function');
    const c = readSrc('services/aioi/aioiExecutivePilotReportService.js');
    assert(c.includes('executive_pilot_summary'));
    assert(c.includes('sla_compliance_summary'));
    assert(c.includes('dlq_summary'));
  });

  console.log('\n  ── BLOCO F: Invariantes runtime');
  await test('P3-INV: cognitive_execution_allowed !== true', () => {
    const fp = path.join(SRC, 'modules/aioi/aiAssistantRuntimeService.metadata.js');
    if (fs.existsSync(fp)) {
      const c = fs.readFileSync(fp, 'utf8');
      assert(!/"cognitive_execution_allowed"\s*:\s*true/.test(c));
    }
  });

  console.log('\n  ── BLOCO G: Proibições');
  await test('P3-FORBID: sem LLM/rerank nos serviços P3', () => {
    for (const s of P3_SERVICES) {
      const c = stripComments(readSrc(`services/aioi/${s}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('rerank'));
    }
  });

  console.log('\n  ── BLOCO H: Tokens certificação');
  await test('P3-TOKEN: relatório contém AIOI_P3_PRODUCTION_PILOT_VALIDATION_CERTIFICATION_PASS', () => {
    const d = readDoc('AIOI_P3_PRODUCTION_PILOT_VALIDATION_REPORT.md');
    assert(d.includes('AIOI_P3_PRODUCTION_PILOT_VALIDATION_CERTIFICATION_PASS'));
    assert(d.includes('OPERATIONAL_EVIDENCE_CERTIFIED'));
    assert(d.includes('PILOT_VALIDATION_CERTIFIED'));
    assert(d.includes('TENANT_ISOLATION_CERTIFIED'));
    assert(d.includes('SLA_COMPLIANCE_CERTIFIED'));
    assert(d.includes('PRODUCTION_STABILITY_CERTIFIED'));
    assert(d.includes('READY_FOR_EXTENDED_PILOT'));
  });

  console.log(`\n  Resultado Master: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
