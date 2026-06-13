/**
 * AIOI-P3.3 — SLA Compliance Audit
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

const slaService = require('../../services/aioi/aioiSlaComplianceService');

const REQUIRED = [
  'sla_total', 'sla_on_track', 'sla_at_risk', 'sla_breached',
  'sla_compliance_rate', 'priority_distribution', 'breach_distribution'
];

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P3.3 — SLA Compliance Audit\n');

  await test('SC-DOC: AIOI_SLA_COMPLIANCE_SPECIFICATION.md', () => {
    assert(readDoc('AIOI_SLA_COMPLIANCE_SPECIFICATION.md'));
  });

  await test('SC-01: aioiSlaComplianceService.js existe', () => {
    assert(readSrc('services/aioi/aioiSlaComplianceService.js'));
  });

  for (const metric of REQUIRED) {
    await test(`SC-METRIC: ${metric}`, () => {
      assert(readSrc('services/aioi/aioiSlaComplianceService.js').includes(metric));
    });
  }

  await test('SC-02: getSlaComplianceSnapshot exportado', () => {
    assert(typeof slaService.getSlaComplianceSnapshot === 'function');
  });

  await test('SC-03: Apenas observação — sem UPDATE IOE', () => {
    const c = stripComments(readSrc('services/aioi/aioiSlaComplianceService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
  });

  await test('SC-04: Sem automação/escalation', () => {
    const c = stripComments(readSrc('services/aioi/aioiSlaComplianceService.js')).toLowerCase();
    assert(!c.includes('escalate') && !c.includes('workfloworchestrator'));
  });

  await test('SC-05: ORG-5 SLA engine intacto', () => {
    assert(readSrc('services/aioi/aioiSlaEngineService.js'));
    const d = readDoc('AIOI_SLA_ENGINE_SPECIFICATION.md');
    assert(d);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
