'use strict';

/**
 * Smoke: escopo portal administrativo vs módulos operacionais.
 * node src/tests/tenantAdminPortalScopeTest.js
 */

const tenantAdminPortalScope = require('../services/tenantAdminPortalScope');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const { filtered, removed } = tenantAdminPortalScope.filterModulesForAdministrativePortal([
  'dashboard',
  'operational',
  'admin',
  'manuia'
]);
assert(!filtered.includes('operational'), 'operational deve ser removido do perfil');
assert(removed.includes('operational'), 'removed deve listar operational');
assert(tenantAdminPortalScope.isAdministrativePortalOnlyUser({ is_tenant_admin: true }), 'tenant admin');
assert(
  tenantAdminPortalScope.isAdministrativePortalOnlyUser({
    role: 'diretor',
    contextual_capabilities: ['system_administration']
  }),
  'diretor com capability system_administration conta como portal admin'
);
assert(
  !tenantAdminPortalScope.isAdministrativePortalOnlyUser({ role: 'diretor', contextual_capabilities: [] }),
  'diretor sem capability não é portal-only'
);

console.log('tenantAdminPortalScopeTest: OK');
