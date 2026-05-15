'use strict';

const assert = require('assert');

function purge() {
  delete require.cache[require.resolve('../services/contextualSystemAdminService')];
  delete require.cache[require.resolve('../middleware/auth')];
}

async function main() {
  const env = { ...process.env };
  try {
    process.env.IMPETUS_CONTEXTUAL_SYSTEM_ADMIN = 'true';
    purge();
    const svc = require('../services/contextualSystemAdminService');

    // 1–2: Admin contextual por company_role_name (sem users.role diretor)
    const sysAdminUser = {
      role: 'gerente',
      company_role_name: 'Administrador do Sistema (Admin IMPETUS)',
      hierarchy_level: 3,
      company_role_hierarchy_level: 3
    };
    const caps = svc.resolveContextualAdminCapabilities(sysAdminUser);
    assert.ok(caps.includes(svc.CAP_SYSTEM_ADMIN));
    assert.ok(caps.includes(svc.CAP_GOVERNANCE));
    const enriched = svc.enrichUserWithContextualCapabilities({ ...sysAdminUser });
    assert.ok(Array.isArray(enriched.contextual_capabilities));
    assert.ok(enriched.contextual_capabilities.includes('system_administration'));

    // 3: Governança — mesmo utilizador
    assert.strictEqual(svc.userHasCapability(enriched, 'governance_access'), true);

    // 4: Utilizadores — bypass hierárquico (função pura)
    assert.strictEqual(svc.userPassesDirectorLevelHierarchyGate(enriched, 1), true);

    // 5: Não precisa role Diretor (role textual continua gerente)
    assert.strictEqual(String(sysAdminUser.role).toLowerCase(), 'gerente');

    // 6: Diretor continua (sem cargo sistema — capabilities só V2 implícitas; gate hierárquico nativo)
    const diretor = { role: 'diretor', hierarchy_level: 1, company_role_name: 'Diretor Industrial' };
    const dCaps = svc.resolveContextualAdminCapabilities(diretor);
    assert.strictEqual(dCaps.includes(svc.CAP_SYSTEM_ADMIN), false);

    // 7: Operador bloqueado
    const op = { role: 'operador', hierarchy_level: 5, company_role_name: 'Operador de Produção' };
    assert.strictEqual(svc.resolveContextualAdminCapabilities(op).length, 0);
    assert.strictEqual(svc.userPassesDirectorLevelHierarchyGate(svc.enrichUserWithContextualCapabilities(op), 1), false);

    // 8: Legacy role admin
    const legacy = { role: 'admin' };
    assert.ok(svc.resolveContextualAdminCapabilities(legacy).includes(svc.CAP_SYSTEM_ADMIN));

    // 9–10: Kill switch / fallback
    process.env.IMPETUS_CONTEXTUAL_SYSTEM_ADMIN = 'false';
    purge();
    const off = require('../services/contextualSystemAdminService');
    assert.strictEqual(off.resolveContextualAdminCapabilities(sysAdminUser).length, 0);
    assert.strictEqual(off.userPassesDirectorLevelHierarchyGate(sysAdminUser, 1), false);

    // 11–12: Sidebar / capability (espelho frontend — função pura)
    process.env.IMPETUS_CONTEXTUAL_SYSTEM_ADMIN = 'true';
    purge();
    const on = require('../services/contextualSystemAdminService');
    const u11 = on.enrichUserWithContextualCapabilities(sysAdminUser);
    assert.ok(u11.contextual_capabilities.length >= 4);

    console.log('[CONTEXTUAL_SYSTEM_ADMIN_SCENARIOS]', 'ok');
  } finally {
    for (const k of Object.keys(env)) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    purge();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
