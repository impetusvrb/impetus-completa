/**
 * Permissões efectivas do utilizador — fonte única RBAC (M1.16).
 *
 * Autoridade primária: roles + role_permissions (via users.role ou users.role_id)
 * Complementar: users.permissions[] (grants directos, nunca substituem revogações futuras)
 *
 * Usado por: promptFirewall, secureContextBuilder, dashboardAccessService,
 * smartPanelCommandService, requirePermission (via hydrate em auth).
 */
const db = require('../db');

const PERMISSION_DENIAL_REPLIES = Object.freeze({
  VIEW_FINANCIAL:
    'Você não possui permissão VIEW_FINANCIAL para acessar dados financeiros.',
  VIEW_STRATEGIC:
    'Você não possui permissão VIEW_STRATEGIC para acessar dados estratégicos.',
  VIEW_HR:
    'Você não possui permissão VIEW_HR para acessar dados de recursos humanos.',
  PROMPT_SECURITY:
    'Pedido bloqueado pela política de segurança IMPETUS (possível injeção de prompt ou jailbreak).',
});

const DEFAULT_DENIAL_REPLY =
  'Você não possui permissão para acessar informações estratégicas. Entre em contato com o administrador para solicitar acesso.';

function parseDirectPermissions(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.values(raw).filter((x) => typeof x === 'string');
  }
  return [];
}

/**
 * Permissões derivadas de roles.code ou users.role_id → role_permissions.
 * @param {object} user
 * @returns {Promise<string[]>}
 */
async function resolveRoleBasedPermissions(user) {
  if (!user?.id) return [];

  try {
    if (user.role_id) {
      const byId = await db.query(
        `SELECT DISTINCT p.code
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1::uuid
         ORDER BY p.code`,
        [user.role_id]
      );
      if (byId.rows.length > 0) {
        return byId.rows.map((r) => r.code);
      }
    }

    const roleCode = String(user.role || '').trim().toLowerCase();
    if (!roleCode) return [];

    const byCode = await db.query(
      `SELECT DISTINCT p.code
       FROM roles ro
       JOIN role_permissions rp ON rp.role_id = ro.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ro.code = $1
       ORDER BY p.code`,
      [roleCode]
    );
    return byCode.rows.map((r) => r.code);
  } catch (e) {
    if (!String(e.message || '').includes('does not exist')) {
      console.warn('[authorize] resolveRoleBasedPermissions:', e.message);
    }
    return [];
  }
}

/**
 * Merge role_permissions (primário) + users.permissions (complementar).
 * @param {object} user
 * @returns {Promise<{ permissions: string[], sources: object }>}
 */
async function getUserPermissions(user) {
  if (!user || !user.id) {
    return { permissions: [], sources: { role: [], direct: [], merged: [] } };
  }

  const rolePerms = await resolveRoleBasedPermissions(user);

  let directPerms = parseDirectPermissions(user.permissions);
  if (directPerms.length === 0 && /^[0-9a-f-]{36}$/i.test(String(user.id))) {
    try {
      const r = await db.query(
        `SELECT permissions FROM users WHERE id = $1 AND deleted_at IS NULL AND active = true`,
        [user.id]
      );
      directPerms = parseDirectPermissions(r.rows?.[0]?.permissions);
    } catch (e) {
      if (!String(e.message || '').includes('does not exist')) {
        console.warn('[authorize] getUserPermissions direct load:', e.message);
      }
    }
  }

  const merged = [...new Set([...rolePerms, ...directPerms])];
  return {
    permissions: merged,
    sources: { role: rolePerms, direct: directPerms, merged },
  };
}

/**
 * Hidrata req.user.permissions com RBAC unificado (chamar no auth middleware).
 * @param {object} user
 * @returns {Promise<object>}
 */
async function hydrateUserPermissions(user) {
  if (!user?.id) return user;
  const { permissions, sources } = await getUserPermissions(user);
  return {
    ...user,
    permissions,
    _effective_permissions_sources: sources,
    _permissions_hydrated: true,
  };
}

/**
 * @param {object} user
 * @param {string} code
 * @returns {Promise<boolean>}
 */
async function userHasPermission(user, code) {
  const { permissions } = await getUserPermissions(user);
  return permissions.includes('*') || permissions.includes(code);
}

function permissionDenialReply(code) {
  return PERMISSION_DENIAL_REPLIES[code] || DEFAULT_DENIAL_REPLY;
}

/**
 * Payload Truth-safe para bloqueios de permissão (F48 — nunca reply vazio).
 * @param {string} code — ex. VIEW_FINANCIAL
 * @param {object} [extra]
 */
function buildTruthSafePermissionDenial(code, extra = {}) {
  const reply = permissionDenialReply(code);
  return {
    ok: false,
    code,
    error: reply,
    reply,
    permission_denied: true,
    industrial_truth: {
      action: 'permission_denied',
      evidence_binding: {
        data_state: 'permission_blocked',
        permission_code: code,
        channel: extra.channel || 'dashboard_chat',
      },
    },
    ...extra,
  };
}

module.exports = {
  getUserPermissions,
  hydrateUserPermissions,
  resolveRoleBasedPermissions,
  userHasPermission,
  permissionDenialReply,
  buildTruthSafePermissionDenial,
  PERMISSION_DENIAL_REPLIES,
  DEFAULT_DENIAL_REPLY,
};
