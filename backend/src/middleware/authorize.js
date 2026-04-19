/**
 * Permissões efetivas do usuário (RBAC / campo users.permissions).
 * Usado por promptFirewall, secureContextBuilder e rotas que não passam por requirePermission.
 */
const db = require('../db');

/**
 * @param {object} user - req.user ou objeto com id e opcionalmente permissions
 * @returns {Promise<{ permissions: string[] }>}
 */
async function getUserPermissions(user) {
  if (!user || !user.id) {
    return { permissions: [] };
  }

  const direct = user.permissions;
  if (Array.isArray(direct) && direct.length > 0) {
    return { permissions: direct };
  }
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const vals = Object.values(direct).filter((v) => typeof v === 'string');
    if (vals.length) return { permissions: vals };
    }

    try {
    const r = await db.query(
      `SELECT permissions FROM users WHERE id = $1 AND deleted_at IS NULL AND active = true`,
      [user.id]
    );
    const p = r.rows?.[0]?.permissions;
    if (Array.isArray(p)) return { permissions: p };
    if (p && typeof p === 'object') {
      return { permissions: Object.values(p).filter((x) => typeof x === 'string') };
    }
  } catch (e) {
    if (!String(e.message || '').includes('does not exist')) {
      console.warn('[authorize] getUserPermissions:', e.message);
    }
  }

  return { permissions: [] };
}

module.exports = { getUserPermissions };
