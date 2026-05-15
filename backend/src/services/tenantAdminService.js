/**
 * IMPETUS — Governança administrativa do tenant (Fase 1)
 * Separação: tenant administration ≠ cargo organizacional.
 * Coexiste com users.role, hierarchy, contextual capabilities.
 */

'use strict';

const db = require('../db');

const ADMIN_TYPES = Object.freeze(['primary', 'secondary', 'recovery']);
const GOVERNANCE_ENV = 'IMPETUS_TENANT_ADMIN_GOVERNANCE';

function isGovernanceEnabled() {
  return String(process.env[GOVERNANCE_ENV] || 'true').toLowerCase() !== 'false';
}

function logTenantAdmin(tag, payload) {
  try {
    console.log(tag, payload);
  } catch (_) {}
}

/**
 * Anexa flags ao utilizador após auth (sessão / JWT).
 */
async function attachTenantAdminToUser(user) {
  const base = {
    ...user,
    is_tenant_admin: false,
    tenant_admin_type: null,
    tenant_admin_can_manage: false
  };
  if (!user || !user.company_id || !user.id) return base;
  if (!isGovernanceEnabled()) return base;

  try {
    const r = await db.query(
      `SELECT admin_type FROM tenant_admins
       WHERE company_id = $1 AND user_id = $2 AND status = 'active'
       LIMIT 1`,
      [user.company_id, user.id]
    );
    if (!r.rows.length) return base;
    const adminType = r.rows[0].admin_type;
    const canManage = adminType === 'primary' || adminType === 'recovery';
    return {
      ...user,
      is_tenant_admin: true,
      tenant_admin_type: adminType,
      tenant_admin_can_manage: canManage
    };
  } catch (e) {
    if (e && e.code === '42P01') {
      return base;
    }
    console.warn('[TENANT_ADMIN_ATTACH]', e.message || e);
    return base;
  }
}

/**
 * Conta quantos outros utilizadores com papel de governança ficam activos se excluirmos excludeUserId.
 */
async function remainingGovernanceAdminCount(companyId, excludeUserId) {
  const ta = await db.query(
    `SELECT COUNT(*)::int AS c FROM tenant_admins
     WHERE company_id = $1 AND status = 'active'`,
    [companyId]
  );
  const nActiveTa = ta.rows[0]?.c ?? 0;
  if (nActiveTa > 0) {
    const ex = await db.query(
      `SELECT COUNT(*)::int AS c FROM tenant_admins
       WHERE company_id = $1 AND status = 'active' AND user_id <> $2`,
      [companyId, excludeUserId]
    );
    return ex.rows[0]?.c ?? 0;
  }
  const leg = await db.query(
    `SELECT COUNT(*)::int AS c FROM users
     WHERE company_id = $1 AND deleted_at IS NULL AND active = true
       AND LOWER(TRIM(COALESCE(role, ''))) = 'admin'
       AND id <> $2`,
    [companyId, excludeUserId]
  );
  return leg.rows[0]?.c ?? 0;
}

/**
 * O utilizador contribui para a cobertura administrativa (último admin)?
 */
async function userContributesToGovernance(companyId, userId) {
  const row = await db.query(
    `SELECT 1 FROM tenant_admins
     WHERE company_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
    [companyId, userId]
  );
  if (row.rows.length) return true;
  const anyTa = await db.query(
    `SELECT 1 FROM tenant_admins WHERE company_id = $1 LIMIT 1`,
    [companyId]
  );
  if (anyTa.rows.length) return false;
  const u = await db.query(
    `SELECT role FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [userId, companyId]
  );
  return u.rows.length > 0 && String(u.rows[0].role || '').toLowerCase() === 'admin';
}

/**
 * Bloqueia desactivação/remoção se for o último administrador activo.
 */
async function assertNotLastGovernanceAdmin(companyId, targetUserId) {
  if (!companyId || !targetUserId) return { ok: true };

  if (!isGovernanceEnabled()) {
    const isAdmin = await db.query(
      `SELECT 1 FROM users
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND active = true
         AND LOWER(TRIM(COALESCE(role, ''))) = 'admin'`,
      [targetUserId, companyId]
    );
    if (!isAdmin.rows.length) return { ok: true };
    const rem = await db.query(
      `SELECT COUNT(*)::int AS c FROM users
       WHERE company_id = $1 AND deleted_at IS NULL AND active = true
         AND LOWER(TRIM(COALESCE(role, ''))) = 'admin' AND id <> $2`,
      [companyId, targetUserId]
    );
    if ((rem.rows[0]?.c ?? 0) === 0) {
      logTenantAdmin('[LAST_ADMIN_PROTECTION]', {
        company_id: companyId,
        target_user_id: targetUserId,
        mode: 'legacy_role_admin'
      });
      return {
        ok: false,
        code: 'LAST_ADMIN_PROTECTION',
        error: 'Não é possível remover o último administrador activo da empresa.'
      };
    }
    return { ok: true };
  }

  if (!(await userContributesToGovernance(companyId, targetUserId))) {
    return { ok: true };
  }
  const rem = await remainingGovernanceAdminCount(companyId, targetUserId);
  if (rem === 0) {
    logTenantAdmin('[LAST_ADMIN_PROTECTION]', { company_id: companyId, target_user_id: targetUserId });
    return {
      ok: false,
      code: 'LAST_ADMIN_PROTECTION',
      error: 'Não é possível remover o último administrador activo da empresa.'
    };
  }
  return { ok: true };
}

async function assertTargetUserInCompany(companyId, userId) {
  const r = await db.query(
    `SELECT id, name, email, role, active FROM users
     WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [userId, companyId]
  );
  if (!r.rows.length) {
    return { ok: false, code: 'USER_NOT_FOUND', error: 'Utilizador não encontrado na empresa' };
  }
  if (!r.rows[0].active) {
    return { ok: false, code: 'USER_INACTIVE', error: 'Utilizador inactivo' };
  }
  return { ok: true, user: r.rows[0] };
}

async function listTenantAdmins(companyId) {
  const r = await db.query(
    `SELECT ta.id, ta.company_id, ta.user_id, ta.admin_type, ta.status,
            ta.created_at, ta.revoked_at,
            u.name AS user_name, u.email AS user_email, u.role AS user_role
     FROM tenant_admins ta
     JOIN users u ON u.id = ta.user_id
     WHERE ta.company_id = $1 AND ta.status = 'active'
     ORDER BY
       CASE ta.admin_type WHEN 'primary' THEN 0 WHEN 'recovery' THEN 1 ELSE 2 END,
       ta.created_at ASC`,
    [companyId]
  );
  return r.rows;
}

/**
 * Promove ou define tipo de administrador de tenant (transaccional).
 */
async function promoteOrSetAdminType({ companyId, actorUserId, targetUserId, adminType }) {
  if (!ADMIN_TYPES.includes(adminType)) {
    return { ok: false, code: 'INVALID_ADMIN_TYPE', error: 'Tipo de administrador inválido' };
  }
  const target = await assertTargetUserInCompany(companyId, targetUserId);
  if (!target.ok) return target;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, admin_type FROM tenant_admins
       WHERE company_id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE`,
      [companyId, targetUserId]
    );

    if (existing.rows.length && existing.rows[0].admin_type === 'primary' && adminType !== 'primary') {
      const otherPrim = await client.query(
        `SELECT COUNT(*)::int AS c FROM tenant_admins
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'primary' AND user_id <> $2`,
        [companyId, targetUserId]
      );
      if ((otherPrim.rows[0]?.c ?? 0) < 1) {
        await client.query('ROLLBACK');
        return {
          ok: false,
          code: 'LAST_PRIMARY',
          error: 'Designe outro administrador primário antes de alterar este registo.'
        };
      }
    }

    if (adminType === 'primary') {
      await client.query(
        `UPDATE tenant_admins
         SET admin_type = 'secondary', updated_at = now()
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'primary'`,
        [companyId]
      );
    }

    if (adminType === 'recovery') {
      await client.query(
        `UPDATE tenant_admins
         SET status = 'revoked', revoked_at = now(), revoked_by = $2, updated_at = now()
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'recovery'`,
        [companyId, actorUserId]
      );
    }

    if (existing.rows.length) {
      await client.query(
        `UPDATE tenant_admins SET admin_type = $2, updated_at = now() WHERE id = $1`,
        [existing.rows[0].id, adminType]
      );
    } else {
      await client.query(
        `INSERT INTO tenant_admins (company_id, user_id, admin_type, status, created_by, created_at)
         VALUES ($1, $2, $3, 'active', $4, now())`,
        [companyId, targetUserId, adminType, actorUserId]
      );
    }

    await client.query('COMMIT');
    logTenantAdmin('[TENANT_ADMIN_CREATED]', {
      company_id: companyId,
      actor: actorUserId,
      target_user: targetUserId,
      admin_type: adminType
    });
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[TENANT_ADMIN_PROMOTE]', e);
    return { ok: false, code: 'PROMOTE_FAILED', error: e.message || 'Falha ao promover administrador' };
  } finally {
    client.release();
  }
}

/**
 * Promoção pela camada Support Recovery (Fase 2): sem actor tenant;
 * created_by / revoked_by em tenant_admins ficam NULL (auditoria em support_recovery_*).
 */
async function promoteOrSetAdminTypeSupport({ companyId, targetUserId, adminType }) {
  if (!ADMIN_TYPES.includes(adminType)) {
    return { ok: false, code: 'INVALID_ADMIN_TYPE', error: 'Tipo de administrador inválido' };
  }
  const target = await assertTargetUserInCompany(companyId, targetUserId);
  if (!target.ok) return target;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, admin_type FROM tenant_admins
       WHERE company_id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE`,
      [companyId, targetUserId]
    );

    if (existing.rows.length && existing.rows[0].admin_type === 'primary' && adminType !== 'primary') {
      const otherPrim = await client.query(
        `SELECT COUNT(*)::int AS c FROM tenant_admins
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'primary' AND user_id <> $2`,
        [companyId, targetUserId]
      );
      if ((otherPrim.rows[0]?.c ?? 0) < 1) {
        await client.query('ROLLBACK');
        return {
          ok: false,
          code: 'LAST_PRIMARY',
          error: 'Designe outro administrador primário antes de alterar este registo.'
        };
      }
    }

    if (adminType === 'primary') {
      await client.query(
        `UPDATE tenant_admins
         SET admin_type = 'secondary', updated_at = now()
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'primary'`,
        [companyId]
      );
    }

    if (adminType === 'recovery') {
      await client.query(
        `UPDATE tenant_admins
         SET status = 'revoked', revoked_at = now(), revoked_by = NULL, updated_at = now()
         WHERE company_id = $1 AND status = 'active' AND admin_type = 'recovery'`,
        [companyId]
      );
    }

    if (existing.rows.length) {
      await client.query(
        `UPDATE tenant_admins SET admin_type = $2, updated_at = now() WHERE id = $1`,
        [existing.rows[0].id, adminType]
      );
    } else {
      await client.query(
        `INSERT INTO tenant_admins (company_id, user_id, admin_type, status, created_by, created_at)
         VALUES ($1, $2, $3, 'active', NULL, now())`,
        [companyId, targetUserId, adminType]
      );
    }

    await client.query('COMMIT');
    logTenantAdmin('[TENANT_ADMIN_CREATED]', {
      company_id: companyId,
      actor: 'support_recovery',
      target_user: targetUserId,
      admin_type: adminType
    });
    console.log('[SUPPORT_RECOVERY_ADMIN_CREATED]', { company_id: companyId, target_user_id: targetUserId, admin_type: adminType });
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[TENANT_ADMIN_PROMOTE_SUPPORT]', e);
    return { ok: false, code: 'PROMOTE_FAILED', error: e.message || 'Falha ao promover administrador (support)' };
  } finally {
    client.release();
  }
}

/**
 * Revoga registo de admin de tenant (não desactiva utilizador).
 */
async function revokeTenantAdmin({ companyId, actorUserId, tenantAdminRowId }) {
  const rowQ = await db.query(
    `SELECT user_id FROM tenant_admins WHERE id = $1 AND company_id = $2 AND status = 'active'`,
    [tenantAdminRowId, companyId]
  );
  if (!rowQ.rows.length) {
    return { ok: false, code: 'NOT_FOUND', error: 'Registo não encontrado' };
  }
  const targetUserId = rowQ.rows[0].user_id;
  const check = await assertNotLastGovernanceAdmin(companyId, targetUserId);
  if (!check.ok) return check;

  const r = await db.query(
    `UPDATE tenant_admins
     SET status = 'revoked', revoked_at = now(), revoked_by = $3, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND status = 'active'
     RETURNING id, user_id`,
    [tenantAdminRowId, companyId, actorUserId]
  );
  if (!r.rows.length) {
    return { ok: false, code: 'NOT_FOUND', error: 'Registo não encontrado' };
  }
  logTenantAdmin('[TENANT_ADMIN_REVOKED]', {
    company_id: companyId,
    actor: actorUserId,
    tenant_admin_id: tenantAdminRowId,
    target_user: r.rows[0].user_id
  });
  return { ok: true };
}

/**
 * Após desactivar utilizador: revoga todos os tenant_admins activos desse user.
 */
async function revokeAllActiveForUser(companyId, userId, actorUserId) {
  await db.query(
    `UPDATE tenant_admins
     SET status = 'revoked', revoked_at = now(), revoked_by = $3, updated_at = now()
     WHERE company_id = $1 AND user_id = $2 AND status = 'active'`,
    [companyId, userId, actorUserId]
  );
}

async function runBootstrapForCompany(companyId) {
  if (!companyId) return { ok: false, error: 'company_id obrigatório' };
  const exists = await db.query(
    `SELECT 1 FROM tenant_admins WHERE company_id = $1 AND status = 'active' LIMIT 1`,
    [companyId]
  );
  if (exists.rows.length) return { ok: true, skipped: true };
  const pick = await db.query(
    `SELECT id FROM users u
     WHERE u.company_id = $1 AND u.deleted_at IS NULL AND u.active = true
       AND (LOWER(TRIM(COALESCE(u.role,''))) = 'admin' OR COALESCE(u.is_company_root,false) = true)
     ORDER BY
       CASE WHEN LOWER(TRIM(COALESCE(u.role,''))) = 'admin' THEN 0 ELSE 1 END,
       CASE WHEN COALESCE(u.is_company_root,false) THEN 0 ELSE 1 END,
       u.created_at ASC NULLS LAST
     LIMIT 1`,
    [companyId]
  );
  if (!pick.rows.length) return { ok: true, skipped: true, no_candidate: true };
  const uid = pick.rows[0].id;
  try {
    await db.query(
      `INSERT INTO tenant_admins (company_id, user_id, admin_type, status, created_by, created_at)
       VALUES ($1, $2, 'primary', 'active', NULL, now())`,
      [companyId, uid]
    );
    logTenantAdmin('[TENANT_ADMIN_BOOTSTRAP]', { company_id: companyId, user_id: uid });
    return { ok: true };
  } catch (e) {
    console.error('[TENANT_ADMIN_BOOTSTRAP]', e);
    return { ok: false, error: e.message };
  }
}

module.exports = {
  ADMIN_TYPES,
  isGovernanceEnabled,
  attachTenantAdminToUser,
  remainingGovernanceAdminCount,
  userContributesToGovernance,
  assertNotLastGovernanceAdmin,
  listTenantAdmins,
  promoteOrSetAdminType,
  promoteOrSetAdminTypeSupport,
  revokeTenantAdmin,
  revokeAllActiveForUser,
  runBootstrapForCompany,
  assertTargetUserInCompany
};
