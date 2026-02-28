/**
 * MIDDLEWARE - INJEÇÃO DE ESCOPO HIERÁRQUICO
 * Resolve e injeta req.hierarchyScope antes das rotas.
 * Impede acesso manual via URL ou manipulação de request.
 * Sempre aplicar filtro no backend — nunca confiar em parâmetros do cliente.
 */
const hierarchicalFilter = require('../services/hierarchicalFilter');

const CACHE_TTL_MS = 60000; // 1 min
const scopeCache = new Map();

function getCacheKey(userId) {
  return `scope:${userId}`;
}

/**
 * Middleware que resolve e injeta req.hierarchyScope
 * Deve ser usado APÓS requireAuth
 */
function requireHierarchyScope(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }

  const cacheKey = getCacheKey(user.id);
  const cached = scopeCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    req.hierarchyScope = cached.scope;
    return next();
  }

  hierarchicalFilter.resolveHierarchyScope(user)
    .then((scope) => {
      scopeCache.set(cacheKey, { scope, expiresAt: Date.now() + CACHE_TTL_MS });
      req.hierarchyScope = scope;
      next();
    })
    .catch((err) => {
      console.error('[HIERARCHY_SCOPE_ERROR]', err);
      req.hierarchyScope = {
        scopeLevel: 'individual',
        managedDepartmentIds: [],
        allowedUserIds: [user.id],
        isFullAccess: false
      };
      next();
    });
}

/**
 * Invalida cache quando usuário/departamento/supervisor muda
 */
function invalidateScopeCache(userId) {
  if (userId) scopeCache.delete(getCacheKey(userId));
}

module.exports = { requireHierarchyScope, invalidateScopeCache };
