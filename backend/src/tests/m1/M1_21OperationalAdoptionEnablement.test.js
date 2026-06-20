'use strict';

/**
 * M1.21 — Operational Adoption Enablement Test
 * node src/tests/m1/M1_21OperationalAdoptionEnablement.test.js
 */

const path = require('path');
const fs = require('fs');

let _passed = 0;
let _failed = 0;

function assert(c, m) {
  if (!c) throw new Error(m);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (e) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
  }
}

async function main() {
  console.log('\n[M1.21] Operational Adoption Enablement\n');

  await test('M1.21 doc exists', () => {
    const p = path.resolve(__dirname, '../../../docs/M1_21_OPERATIONAL_ADOPTION_ENABLEMENT.md');
    assert(fs.existsSync(p), 'doc missing');
  });

  await test('Service exports phases', () => {
    const svc = require('../../services/audit/m1OperationalAdoptionEnablementService');
    assert(svc.PHASE === 'M1.21', 'phase must be M1.21');
    assert(svc.PILOT === '511f4819-fc48-479e-b11e-49ba4fb9c81b', 'pilot tenant');
    assert(typeof svc.runM121OperationalAdoptionEnablement === 'function', 'run fn');
  });

  await test('Routes module loads', () => {
    const routes = require('../../routes/m1OperationalAdoptionEnablementRoutes');
    assert(typeof routes === 'function', 'router fn');
    assert(routes.stack?.length === 5, '5 routes');
  });

  await test('Consolidated assessment structure', async () => {
    const svc = require('../../services/audit/m1OperationalAdoptionEnablementService');
    const out = await svc.runM121OperationalAdoptionEnablement();
    assert(out.phase === 'M1.21', 'phase');
    assert(out.pass === true, 'pass');
    assert(out.verdict === 'OPERATIONAL_ADOPTION_READY', 'verdict');
    assert(out.architecture_changes === 0, 'no arch changes');
    assert(out.rbac_changes === 0, 'no rbac changes');
    assert(out.esg.environment_operational_journey_documented === true, 'esg journey');
    assert(out.workflow.workflow_templates_available === true, 'wf templates');
    assert(out.foundation.mes_operational_gap_documented === true, 'mes gap');
    assert(out.esg_activation_ready === true, 'esg ready');
    assert(out.workflow_activation_ready === true, 'wf ready');
    assert(out.foundation_activation_ready === true, 'foundation ready');
  });

  console.log(`\n[M1.21] ${_passed} passed, ${_failed} failed\n`);
  process.exit(_failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
