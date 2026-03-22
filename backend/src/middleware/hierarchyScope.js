const { resolveHierarchyScope } = require('../services/hierarchicalFilter');

async function requireHierarchyScope(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado' });
    }
    req.hierarchyScope = await resolveHierarchyScope(req.user);
    next();
  } catch (e) {
    next(e);
  }
}

/** Hook para invalidar cache de escopo (ex.: após alterar usuário). */
function invalidateScopeCache() {
  /* opcional: integrar cache em hierarchicalFilter se existir */
}

module.exports = { requireHierarchyScope, invalidateScopeCache };
