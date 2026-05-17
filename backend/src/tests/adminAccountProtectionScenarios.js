'use strict';

/**
 * node src/tests/adminAccountProtectionScenarios.js
 */

const assert = require('assert');

process.env.IMPETUS_ALLOW_ADMIN_ROLE_DEMOTION = 'false';

const svc = require('../services/adminAccountProtectionService');

assert.strictEqual(svc.isDemotedRole('colaborador'), true);
assert.strictEqual(svc.isDemotedRole('operador'), true);
assert.strictEqual(svc.isDemotedRole('coordenador'), false);

assert.strictEqual(
  svc.isProtectedGovernanceAccount({
    role: 'colaborador',
    company_role_name: 'Administrador do Sistema (Admin IMPETUS)',
    is_tenant_admin: false
  }),
  true
);

assert.strictEqual(
  svc.isProtectedGovernanceAccount({ role: 'operador', company_role_name: 'Operador de Produção' }),
  false
);

(async () => {
  const r = await svc.assertGovernanceAccountNotDemoted({
    companyId: '00000000-0000-0000-0000-000000000001',
    targetUserId: '00000000-0000-0000-0000-000000000099',
    patch: { role: 'colaborador' }
  });
  assert.strictEqual(r.ok, true, 'unknown user should pass');
  console.log('adminAccountProtectionScenarios: OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
