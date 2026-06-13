/**
 * AIOI-P5.1 — Enterprise Governance Audit
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

const governance = require('../../services/aioi/aioiEnterpriseGovernanceService');

const OUTPUTS = [
  'governance_compliance_snapshot', 'governance_maturity_score',
  'policy_adherence', 'operational_governance_summary', 'tenant_governance_posture'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P5.1 — Enterprise Governance Audit\n');

  await test('EG-DOC: spec existe', () => assert(readDoc('AIOI_ENTERPRISE_GOVERNANCE_SPECIFICATION.md')));
  await test('EG-01: serviço existe', () => assert(readSrc('services/aioi/aioiEnterpriseGovernanceService.js')));
  await test('EG-02: getGovernanceComplianceSnapshot', () => assert(typeof governance.getGovernanceComplianceSnapshot === 'function'));

  for (const o of OUTPUTS) {
    await test(`EG-OUT: ${o}`, () => assert(readSrc('services/aioi/aioiEnterpriseGovernanceService.js').includes(o)));
  }

  await test('EG-03: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiEnterpriseGovernanceService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
  });

  await test('EG-04: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiEnterpriseGovernanceService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
