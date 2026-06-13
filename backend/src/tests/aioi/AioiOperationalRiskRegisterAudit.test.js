/**
 * AIOI-P6.5 — Operational Risk Register Audit
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

const riskRegister = require('../../services/aioi/aioiOperationalRiskRegisterService');

const CATEGORIES = [
  'governance_risk', 'operational_risk', 'sla_risk',
  'capacity_risk', 'tenant_risk', 'compliance_risk', 'risk_trend', 'risk_score'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.5 — Operational Risk Register Audit\n');

  await test('RR-DOC: spec existe', () => assert(readDoc('AIOI_OPERATIONAL_RISK_REGISTER_SPECIFICATION.md')));
  await test('RR-01: getOperationalRiskRegister', () => assert(typeof riskRegister.getOperationalRiskRegister === 'function'));

  for (const c of CATEGORIES) {
    await test(`RR-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiOperationalRiskRegisterService.js').includes(c)));
  }

  await test('RR-02: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiOperationalRiskRegisterService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
  });

  await test('RR-03: getOperationalRiskRegister executa', async () => {
    const r = await riskRegister.getOperationalRiskRegister();
    assert(typeof r.risk_score === 'number');
    assert(r.risk_trend);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
