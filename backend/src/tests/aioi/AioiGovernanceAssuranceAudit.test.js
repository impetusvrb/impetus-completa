/**
 * AIOI-P6.1 — Governance Assurance Audit
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

const assurance = require('../../services/aioi/aioiGovernanceAssuranceService');

const OUTPUTS = [
  'continuous_governance_validation', 'governance_assurance_score',
  'policy_assurance', 'sovereign_protection_verification', 'enterprise_assurance_summary'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.1 — Governance Assurance Audit\n');

  await test('GA-DOC: spec existe', () => assert(readDoc('AIOI_GOVERNANCE_ASSURANCE_SPECIFICATION.md')));
  await test('GA-01: serviço existe', () => assert(readSrc('services/aioi/aioiGovernanceAssuranceService.js')));
  await test('GA-02: validateContinuousGovernance', () => assert(typeof assurance.validateContinuousGovernance === 'function'));

  for (const o of OUTPUTS) {
    await test(`GA-OUT: ${o}`, () => assert(readSrc('services/aioi/aioiGovernanceAssuranceService.js').includes(o)));
  }

  await test('GA-03: READ ONLY', () => {
    const c = stripComments(readSrc('services/aioi/aioiGovernanceAssuranceService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
  });

  await test('GA-04: sem LLM', () => {
    const c = stripComments(readSrc('services/aioi/aioiGovernanceAssuranceService.js')).toLowerCase();
    assert(!c.includes('openai') && !c.includes('gemini'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
