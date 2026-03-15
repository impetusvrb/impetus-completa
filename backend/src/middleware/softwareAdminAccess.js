/**
 * IMPETUS - Controle de Acesso: Administrador do Software
 * Módulo Integrações e Conectividades - apenas Administrador do Software
 * Não visível para: colaboradores, supervisores, gerentes, diretores, CEO
 */
function requireSoftwareAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  const role = (user.role || '').toLowerCase();
  const allowed = ['admin', 'administrador_software', 'administrador'];
  if (allowed.includes(role)) {
    return next();
  }
  return res.status(403).json({
    ok: false,
    error: 'Acesso restrito ao Administrador do Software',
    code: 'SOFTWARE_ADMIN_REQUIRED'
  });
}

module.exports = { requireSoftwareAdmin };
