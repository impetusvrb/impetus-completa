'use strict';

/**
 * Emite a mesma sessão JWT + sessions que POST /api/auth/login (RBAC/hierarchy preservados).
 */

const jwt = require('jsonwebtoken');
const db = require('../../db');
const { JWT_SECRET, JWT_ALGORITHMS } = require('../../middleware/auth');
const { resolveHierarchyLevel } = require('../../services/hierarchyResolver');
const contextualSystemAdmin = require('../../services/contextualSystemAdminService');
const tenantAdminService = require('../../services/tenantAdminService');
const roleVerification = require('../../services/roleVerificationService');
const dashboardProfileResolver = require('../../services/dashboardProfileResolver');

async function loadUserForLogin(userId) {
  const result = await db.query(
    `SELECT u.*,
            d.name AS department_resolved_name,
            cr.dashboard_functional_hint AS company_role_dashboard_hint,
            cr.hierarchy_level AS company_role_hierarchy_level,
            cr.name AS company_role_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
     LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.company_id = u.company_id AND cr.active = true
     WHERE u.id = $1::uuid AND u.active = true`,
    [userId]
  );
  return result.rows[0] || null;
}

async function issueSessionForUser(user, meta = {}) {
  if (!user?.id) throw new Error('USER_REQUIRED');

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role,
      company_id: user.company_id,
      federation: meta.federation === true,
      provider_id: meta.provider_id || null,
      mfa_verified: meta.mfa === true,
      mfa_method: meta.mfa_method || null,
    },
    JWT_SECRET,
    { expiresIn: '8h', algorithm: (JWT_ALGORITHMS && JWT_ALGORITHMS[0]) || 'HS256' }
  );

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  const requireSessionPersistence =
    String(process.env.IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE || 'true').toLowerCase() !== 'false';

  try {
    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );
  } catch (e) {
    if (requireSessionPersistence) throw e;
    console.warn('[FEDERATION_SESSION]', e.message);
  }

  const needsVerification = roleVerification.needsVerification({
    ...user,
    role_verified: user.role_verified,
    role_verification_status: user.role_verification_status,
    is_company_root: user.is_company_root,
  });

  let dashboardProfile = user.dashboard_profile || null;
  try {
    const { profile } = await dashboardProfileResolver.resolveAndPersistProfile(user);
    if (profile) dashboardProfile = profile;
  } catch (e) {
    console.warn('[FEDERATION_SESSION] profile:', e.message);
  }

  const roleNormalized = (user.role || 'colaborador').toString().toLowerCase();
  const canonicalLevel = resolveHierarchyLevel(
    {
      hierarchy_level: user.hierarchy_level,
      company_role_hierarchy_level: user.company_role_hierarchy_level,
      company_role_id: user.company_role_id,
      role: user.role,
    },
    { silent: true }
  );

  const forCaps = contextualSystemAdmin.enrichUserWithContextualCapabilities({
    id: user.id,
    role: roleNormalized,
    company_role_name: user.company_role_name || null,
    company_role_id: user.company_role_id || null,
    hierarchy_level: canonicalLevel,
    company_role_hierarchy_level: user.company_role_hierarchy_level ?? null,
  });

  let taFlags = { is_tenant_admin: false, tenant_admin_type: null, tenant_admin_can_manage: false };
  try {
    taFlags = await tenantAdminService.attachTenantAdminToUser({
      id: user.id,
      company_id: user.company_id,
      ...forCaps,
    });
  } catch (e) {
    console.warn('[FEDERATION_SESSION][tenant_admin]', e.message);
  }

  return {
    message: meta.message || 'Login federado realizado com sucesso',
    token,
    federation: true,
    provider_id: meta.provider_id || null,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleNormalized,
      company_id: user.company_id,
      is_first_access: user.is_first_access,
      role_verified: user.role_verified === true,
      role_verification_status: user.role_verification_status || 'pending',
      is_company_root: user.is_company_root === true,
      needs_role_verification: needsVerification,
      functional_area: user.functional_area || null,
      dashboard_profile: dashboardProfile || null,
      job_title: user.job_title || null,
      department: user.department || null,
      area: user.area || null,
      hierarchy_level: canonicalLevel,
      is_factory_team_account: user.is_factory_team_account === true,
      department_resolved_name: user.department_resolved_name || null,
      company_role_dashboard_hint: user.company_role_dashboard_hint || null,
      company_role_name: user.company_role_name || null,
      company_role_id: user.company_role_id || null,
      contextual_capabilities: Array.isArray(forCaps.contextual_capabilities)
        ? forCaps.contextual_capabilities
        : [],
      is_tenant_admin: !!taFlags.is_tenant_admin,
      tenant_admin_type: taFlags.tenant_admin_type || null,
      tenant_admin_can_manage: !!taFlags.tenant_admin_can_manage,
    },
  };
}

async function resolveUserByFederationLink(companyId, providerId, externalSubject, externalEmail) {
  const link = await db.query(
    `SELECT user_id FROM federation_identity_links
     WHERE company_id = $1::uuid AND provider_id = $2::uuid AND external_subject = $3`,
    [companyId, providerId, externalSubject]
  );
  if (link.rows[0]?.user_id) {
    return loadUserForLogin(link.rows[0].user_id);
  }

  if (externalEmail) {
    const byEmail = await db.query(
      `SELECT id FROM users
       WHERE company_id = $1::uuid AND lower(trim(email)) = lower(trim($2)) AND active = true
       LIMIT 1`,
      [companyId, externalEmail]
    );
    if (byEmail.rows[0]?.id) {
      const user = await loadUserForLogin(byEmail.rows[0].id);
      if (user) {
        await db.query(
          `INSERT INTO federation_identity_links
           (company_id, provider_id, user_id, external_subject, external_email, last_login_at)
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,now())
           ON CONFLICT (company_id, provider_id, external_subject)
           DO UPDATE SET user_id = EXCLUDED.user_id, external_email = EXCLUDED.external_email, last_login_at = now()`,
          [companyId, providerId, user.id, externalSubject, externalEmail]
        );
        return user;
      }
    }
  }

  return null;
}

module.exports = {
  loadUserForLogin,
  issueSessionForUser,
  resolveUserByFederationLink,
};
