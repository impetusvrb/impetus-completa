'use strict';

/**
 * M1.20 — Remaining Enterprise Readiness Certification Test
 * node src/tests/m1/M1_20EnterpriseRemainingCertification.test.js
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
  console.log('\n[M1.20] Remaining Enterprise Readiness Certification\n');

  process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';
  process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE = 'true';
  process.env.IMPETUS_ENTERPRISE_SECURITY_ROLLOUT = 'true';

  await test('Workflow permission gate module exists', () => {
    delete require.cache[require.resolve('../../workflowEngine/permission/workflowPermissionGate')];
    const g = require('../../workflowEngine/permission/workflowPermissionGate');
    const d = g.getWorkflowSecurityDiagnostics();
    assert(d.workflow_permission_enforced === true, 'enforce must be true');
    assert(d.workflow_capability_matrix_enabled === true, 'matrix must be true');
  });

  await test('M1.20 doc exists', () => {
    const p = path.resolve(__dirname, '../../../docs/M1_20_ENTERPRISE_REMAINING_READINESS.md');
    assert(fs.existsSync(p), 'doc missing');
  });

  await test('Certification service exports phases', () => {
    const svc = require('../../services/audit/m1EnterpriseRemainingCertificationService');
    assert(svc.ESG_MODULES.length === 4, '4 ESG modules');
    assert(svc.FOUNDATION_MODULES.length === 3, '3 foundation modules');
  });

  console.log(`\n[M1.20] ${_passed} passed, ${_failed} failed\n`);
  process.exit(_failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
