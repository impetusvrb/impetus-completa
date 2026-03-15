/**
 * MIDDLEWARE - ROTAS INTERNAS
 * Apenas role = internal_admin
 */

const { AUTH } = require('../constants/messages');

function requireInternalAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: AUTH.NOT_AUTHENTICATED });
  }
  if (user.role !== 'internal_admin') {
    return res.status(403).json({
      ok: false,
      error: AUTH.ACCESS_DENIED_INTERNAL,
      code: 'INTERNAL_ADMIN_REQUIRED'
    });
  }
  next();
}

module.exports = { requireInternalAdmin };
