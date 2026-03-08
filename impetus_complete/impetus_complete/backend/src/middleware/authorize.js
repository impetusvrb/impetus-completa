/**
 * RBAC AVANÇADO - Middleware authorize(permission)
 * A IA só pode acessar dados se o backend validar permissão.
 * Nenhuma decisão de acesso é delegada à IA.
 */
const db = require('../db');
const { logAction } = require('./audit');

const ROLE_CODE_MAP = {
  ceo: 'ceo',
  internal_admin: 'diretor',
  diretor: 'diretor',
  gerente: 'gerente',
  coordenador: 'coordenador',
  supervisor: 'supervisor',
  colaborador: 'colaborador'
};

let permissionsCache = null;
let rolesCache = null;

async function loadPermissionsCache() {
  if (permissionsCache) return permissionsCache;
  try {
    const r = await db.query('SELECT id, code FROM permissions');
    permissionsCache = Object.fromEntries(r.rows.map((row) => [row.code, row.id]));
  } catch {
    permissionsCache = {};
  }
  return permissionsCache;
}

async function loadRolesCache() {
  if (rolesCache) return rolesCache;
  try {
    const r = await db.query('SELECT id, code FROM roles');
    rolesCache = Object.fromEntries(r.rows.map((row) => [row.code, row.id]));
  } catch {
    rolesCache = {};
  }
  return rolesCache;
}

/**
 * Obtém permissões efetivas do usuário (role + hierarchy fallback)
 */
async function getUserPermissions(user) {
  try {
    const roleCode = ROLE_CODE_MAP[user.role] || (user.hierarchy_level <= 1 ? 'diretor' : user.hierarchy_level === 2 ? 'gerente' : user.hierarchy_level === 3 ? 'coordenador' : user.hierarchy_level === 4 ? 'supervisor' : 'colaborador');
    const roles = await loadRolesCache();
    const perms = await loadPermissionsCache();

    let roleId = user.role_id || roles[roleCode];
    if (!roleId) {
      const fallback = await db.query('SELECT id FROM roles WHERE hierarchy_level = $1 LIMIT 1', [Math.min(user.hierarchy_level ?? 5, 5)]);
      roleId = fallback.rows[0]?.id || roles.colaborador;
    }
    if (!roleId) {
      return { permissions: ['*'], hasWildcard: true };
    }

    const rp = await db.query(
    `SELECT p.code FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  const fromRole = rp.rows.map((row) => row.code);

  const fromUser = Array.isArray(user.permissions) ? user.permissions : [];
    const hasWildcard = fromUser.includes('*') || fromRole.includes('*');
    const combined = [...new Set([...fromRole, ...fromUser])];

    return { permissions: combined, hasWildcard };
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('permissions') || err.message?.includes('roles')) {
      return { permissions: ['*'], hasWildcard: true };
    }
    throw err;
  }
}

/**
 * authorize(permission) - Middleware
 * Exige que o usuário tenha a permissão especificada.
 */
function authorize(permission) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
    }

    try {
      const { permissions, hasWildcard } = await getUserPermissions(user);
      const hasPermission = hasWildcard || permissions.includes(permission);

      if (!hasPermission) {
        await logAction({
          companyId: user.company_id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'access_denied',
          entityType: 'permission',
          description: `Tentativa de acesso negada: permissão ${permission} não concedida`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          severity: 'warning',
          success: false
        });
        return res.status(403).json({
          ok: false,
          error: 'Você não possui permissão para acessar este recurso.',
          code: 'AUTH_PERMISSION_DENIED',
          required: permission
        });
      }

      req.userPermissions = permissions;
      next();
    } catch (err) {
      console.error('[AUTHORIZE_ERROR]', err);
      return res.status(500).json({ ok: false, error: 'Erro ao verificar permissões' });
    }
  };
}

/**
 * authorizeAny(...permissions) - Usuário precisa de pelo menos uma
 */
function authorizeAny(...requiredPerms) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
    }
    try {
      const { permissions: userPerms, hasWildcard } = await getUserPermissions(user);
      const hasAny = hasWildcard || requiredPerms.some((p) => userPerms.includes(p));
      if (!hasAny) {
        await logAction({
          companyId: user.company_id,
          userId: user.id,
          action: 'access_denied',
          entityType: 'permission',
          description: `Permissão negada: requer uma de [${requiredPerms.join(', ')}]`,
          ipAddress: req.ip,
          severity: 'warning',
          success: false
        });
        return res.status(403).json({ ok: false, error: 'Permissão insuficiente', code: 'AUTH_PERMISSION_DENIED' });
      }
      req.userPermissions = userPerms;
      next();
    } catch (err) {
      console.error('[AUTHORIZE_ANY_ERROR]', err);
      return res.status(500).json({ ok: false, error: 'Erro ao verificar permissões' });
    }
  };
}

module.exports = { authorize, authorizeAny, getUserPermissions };
