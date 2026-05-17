'use strict';

/**
 * Contas de administrador do software (tenant / Administrador IMPETUS / role admin).
 * — Imutáveis via Gestão de Usuários (ninguém altera dados sensíveis).
 * — Novas contas com perfil de admin do software recebem role admin + tenant admin + módulos completos.
 */

const db = require('../db');
const contextualSystemAdmin = require('./contextualSystemAdminService');
const tenantAdminService = require('./tenantAdminService');

const DEMOTED_ROLES = Object.freeze(
  new Set(['colaborador', 'auxiliar', 'auxiliar_producao', 'operador'])
);

/** Campos que a API de gestão não pode alterar em contas bloqueadas. */
const IMMUTABLE_ADMIN_PATCH_KEYS = Object.freeze([
  'name',
  'email',
  'role',
  'area',
  'job_title',
  'department',
  'department_id',
  'supervisor_id',
  'phone',
  'whatsapp_number',
  'executive_verified',
  'hierarchy_level',
  'permissions',
  'active',
  'functional_area',
  'dashboard_profile',
  'hr_responsibilities',
  'company_role_id'
]);

const SOFTWARE_ADMIN_PERMISSIONS = Object.freeze(['*']);

function isEditOverrideAllowed() {
  return String(process.env.IMPETUS_ALLOW_SOFTWARE_ADMIN_EDIT || 'false').toLowerCase() === 'true';
}

function isDemotedRole(role) {
  return DEMOTED_ROLES.has(String(role || '').toLowerCase().trim());
}

async function loadProtectionContext(userId, companyId) {
  const r = await db.query(
    `SELECT u.id, u.role, u.is_company_root, u.company_role_id, cr.name AS company_role_name
     FROM users u
     LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.company_id = u.company_id
     WHERE u.id = $1 AND u.company_id = $2 AND u.deleted_at IS NULL`,
    [userId, companyId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const attached = await tenantAdminService.attachTenantAdminToUser({
    id: userId,
    company_id: companyId,
    role: row.role
  });
  return { ...row, is_tenant_admin: attached.is_tenant_admin === true };
}

/** Conta tratada como administrador do software IMPETUS (acesso total ao portal admin). */
function isSoftwareAdminAccount(ctx) {
  if (!ctx) return false;
  const role = String(ctx.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return true;
  if (ctx.is_company_root === true) return true;
  if (ctx.is_tenant_admin === true) return true;
  return contextualSystemAdmin.matchesSystemAdministratorCompanyRole({
    company_role_name: ctx.company_role_name
  });
}

function isSoftwareAdminLocked(ctx) {
  return isSoftwareAdminAccount(ctx) && !isEditOverrideAllowed();
}

function isProtectedGovernanceAccount(ctx) {
  return isSoftwareAdminAccount(ctx);
}

async function resolveCompanyRoleName(companyId, companyRoleId) {
  if (!companyRoleId) return null;
  const r = await db.query(
    `SELECT name FROM company_roles WHERE id = $1::uuid AND company_id = $2::uuid AND active = true`,
    [companyRoleId, companyId]
  );
  return r.rows[0]?.name || null;
}

async function findSystemAdministratorCompanyRoleId(companyId) {
  const r = await db.query(
    `SELECT id, name FROM company_roles
     WHERE company_id = $1::uuid AND active = true
     ORDER BY hierarchy_level ASC NULLS LAST, created_at ASC`,
    [companyId]
  );
  for (const row of r.rows || []) {
    if (
      contextualSystemAdmin.matchesSystemAdministratorCompanyRole({
        company_role_name: row.name
      })
    ) {
      return row.id;
    }
  }
  return null;
}

/**
 * Criação com cargo de Administrador do Sistema ou role admin → perfil canónico de admin do software.
 */
function shouldProvisionAsSoftwareAdmin({ role, companyRoleId, companyRoleName, softwareAdminFlag }) {
  if (softwareAdminFlag === true) return true;
  if (String(role || '').toLowerCase() === 'admin') return true;
  if (
    companyRoleName &&
    contextualSystemAdmin.matchesSystemAdministratorCompanyRole({ company_role_name: companyRoleName })
  ) {
    return true;
  }
  return false;
}

/**
 * Normaliza payload de criação antes do INSERT.
 */
async function normalizeCreatePayloadForSoftwareAdmin(companyId, validatedData) {
  let companyRoleId = validatedData.company_role_id || null;
  let companyRoleName = null;
  if (companyRoleId) {
    companyRoleName = await resolveCompanyRoleName(companyId, companyRoleId);
  } else {
    companyRoleId = await findSystemAdministratorCompanyRoleId(companyId);
    if (companyRoleId) companyRoleName = await resolveCompanyRoleName(companyId, companyRoleId);
  }

  const provision = shouldProvisionAsSoftwareAdmin({
    role: validatedData.role,
    companyRoleId,
    companyRoleName,
    softwareAdminFlag: validatedData.software_admin === true
  });

  if (!provision) {
    return { provision: false, data: validatedData, companyRoleId };
  }

  return {
    provision: true,
    companyRoleId: companyRoleId || (await findSystemAdministratorCompanyRoleId(companyId)),
    data: {
      ...validatedData,
      role: 'admin',
      hierarchy_level: 1,
      functional_area: validatedData.functional_area || 'admin',
      dashboard_profile: 'admin_system',
      permissions: SOFTWARE_ADMIN_PERMISSIONS,
      company_role_id: companyRoleId || validatedData.company_role_id
    }
  };
}

/**
 * Após INSERT: tenant admin primário + campos de identidade alinhados.
 */
async function provisionSoftwareAdminAfterCreate({ companyId, userId, actorUserId, companyRoleId }) {
  const sysRoleId = companyRoleId || (await findSystemAdministratorCompanyRoleId(companyId));
  await db.query(
    `UPDATE users SET
       role = 'admin',
       hierarchy_level = 1,
       functional_area = COALESCE(NULLIF(functional_area, ''), 'admin'),
       dashboard_profile = 'admin_system',
       permissions = $3::jsonb,
       company_role_id = COALESCE(company_role_id, $4::uuid),
       is_company_root = COALESCE(is_company_root, false),
       updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [userId, companyId, JSON.stringify(SOFTWARE_ADMIN_PERMISSIONS), sysRoleId]
  );

  try {
    await tenantAdminService.promoteOrSetAdminType({
      companyId,
      actorUserId: actorUserId || userId,
      targetUserId: userId,
      adminType: 'primary'
    });
  } catch (e) {
    console.warn('[SOFTWARE_ADMIN_PROVISION][tenant_admin]', e.message || e);
  }

  try {
    const userIdentitySync = require('./userIdentitySync');
    await userIdentitySync.syncHierarchyFromCompanyRole({
      userId,
      companyRoleId: sysRoleId,
      reason: 'software_admin_provision'
    });
  } catch (e) {
    console.warn('[SOFTWARE_ADMIN_PROVISION][hierarchy_sync]', e.message || e);
  }

  return { ok: true, company_role_id: sysRoleId };
}

function patchTouchesImmutableFields(patch) {
  if (!patch || typeof patch !== 'object') return [];
  return IMMUTABLE_ADMIN_PATCH_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(patch, k));
}

/**
 * Bloqueia qualquer alteração em conta de admin do software (inclui o próprio utilizador via painel admin).
 */
async function assertSoftwareAdminAccountMutable(opts) {
  if (isEditOverrideAllowed()) return { ok: true };

  const { companyId, targetUserId, patch } = opts || {};
  if (!companyId || !targetUserId) return { ok: true };

  const ctx = await loadProtectionContext(targetUserId, companyId);
  if (!isSoftwareAdminLocked(ctx)) return { ok: true };

  const touched = patch ? patchTouchesImmutableFields(patch) : [];
  if (patch && touched.length > 0) {
    return {
      ok: false,
      code: 'SOFTWARE_ADMIN_ACCOUNT_IMMUTABLE',
      error:
        'Esta conta é administrador do software IMPETUS e está protegida. Não é permitido alterar nome, email, papel, cargo, permissões ou estado. Crie outro utilizador para funções operacionais.',
      locked_fields: touched
    };
  }

  return { ok: true };
}

/** Bloqueia qualquer operação de gestão (reset senha, perfil, etc.) sem patch explícito. */
async function assertSoftwareAdminManagementBlocked(opts) {
  if (isEditOverrideAllowed()) return { ok: true };
  const { companyId, targetUserId } = opts || {};
  if (!companyId || !targetUserId) return { ok: true };
  const ctx = await loadProtectionContext(targetUserId, companyId);
  if (!isSoftwareAdminLocked(ctx)) return { ok: true };
  return {
    ok: false,
    code: 'SOFTWARE_ADMIN_ACCOUNT_IMMUTABLE',
    error:
      'Esta conta é administrador do software IMPETUS e está protegida contra alterações pela Gestão de Usuários.'
  };
}

/** Bloqueia desactivação / remoção. */
async function assertSoftwareAdminAccountNotDeactivated(opts) {
  if (isEditOverrideAllowed()) return { ok: true };

  const { companyId, targetUserId, deactivating } = opts || {};
  if (!deactivating || !companyId || !targetUserId) return { ok: true };

  const ctx = await loadProtectionContext(targetUserId, companyId);
  if (!isSoftwareAdminLocked(ctx)) return { ok: true };

  return {
    ok: false,
    code: 'SOFTWARE_ADMIN_ACCOUNT_IMMUTABLE',
    error: 'Não é permitido desactivar ou remover a conta de administrador do software IMPETUS.'
  };
}

/** Legado: rebaixamento para colaborador (mantido para mensagens específicas). */
async function assertGovernanceAccountNotDemoted(opts) {
  const { companyId, targetUserId, patch } = opts || {};
  if (!patch || patch.role === undefined) {
    return assertSoftwareAdminAccountMutable(opts);
  }
  const imm = await assertSoftwareAdminAccountMutable(opts);
  if (!imm.ok) return imm;
  if (isEditOverrideAllowed()) return { ok: true };

  const ctx = await loadProtectionContext(targetUserId, companyId);
  if (!isSoftwareAdminAccount(ctx)) return { ok: true };

  if (isDemotedRole(patch.role)) {
    return {
      ok: false,
      code: 'ADMIN_ACCOUNT_ROLE_DEMOTION_BLOCKED',
      error:
        'Esta conta é administrador do software e não pode ser alterada para colaborador ou operador.'
    };
  }
  return { ok: true };
}

async function assertCreateRoleCompatibleWithStructuralRole(companyId, role, companyRoleId) {
  if (isEditOverrideAllowed() || !companyRoleId) return { ok: true };
  const name = await resolveCompanyRoleName(companyId, companyRoleId);
  if (!contextualSystemAdmin.matchesSystemAdministratorCompanyRole({ company_role_name: name })) {
    return { ok: true };
  }
  if (isDemotedRole(role)) {
    return {
      ok: false,
      code: 'ADMIN_ACCOUNT_ROLE_DEMOTION_BLOCKED',
      error:
        'Administradores do software devem ser criados com papel admin (ou cargo Administrador do Sistema). Não use colaborador/operador.'
    };
  }
  return { ok: true };
}

async function enrichUserAdminFlags(userRow, companyId) {
  if (!userRow || !userRow.id) return userRow;
  const ctx = await loadProtectionContext(userRow.id, companyId || userRow.company_id);
  const softwareAdmin = isSoftwareAdminAccount(ctx);
  return {
    ...userRow,
    software_admin: softwareAdmin,
    software_admin_locked: isSoftwareAdminLocked(ctx)
  };
}

/** Enriquecimento síncrono para listagens (usa structural_role_name + is_tenant_admin da query). */
function flagsFromUserRow(row, isTenantAdmin = false) {
  const ctx = {
    role: row.role,
    is_company_root: row.is_company_root === true,
    is_tenant_admin: isTenantAdmin === true,
    company_role_name: row.structural_role_name || row.company_role_name
  };
  return {
    software_admin: isSoftwareAdminAccount(ctx),
    software_admin_locked: isSoftwareAdminLocked(ctx)
  };
}

module.exports = {
  DEMOTED_ROLES,
  IMMUTABLE_ADMIN_PATCH_KEYS,
  SOFTWARE_ADMIN_PERMISSIONS,
  isDemotedRole,
  isSoftwareAdminAccount,
  isSoftwareAdminLocked,
  isProtectedGovernanceAccount,
  shouldProvisionAsSoftwareAdmin,
  normalizeCreatePayloadForSoftwareAdmin,
  provisionSoftwareAdminAfterCreate,
  assertSoftwareAdminAccountMutable,
  assertSoftwareAdminManagementBlocked,
  assertSoftwareAdminAccountNotDeactivated,
  assertGovernanceAccountNotDemoted,
  assertCreateRoleCompatibleWithStructuralRole,
  enrichUserAdminFlags,
  flagsFromUserRow,
  loadProtectionContext,
  findSystemAdministratorCompanyRoleId
};
