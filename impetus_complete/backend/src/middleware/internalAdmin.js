/**
 * MIDDLEWARE - ROTAS INTERNAS
 * Apenas role = internal_admin
 */

function requireInternalAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  if (user.role !== 'internal_admin') {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito à equipe interna',
      code: 'INTERNAL_ADMIN_REQUIRED'
    });
  }
  next();
}

module.exports = { requireInternalAdmin };
