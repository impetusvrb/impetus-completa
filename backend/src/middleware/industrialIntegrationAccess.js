function requireIndustrialView(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  next();
}

function requireIndustrialAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  if (req.user.is_company_root) return next();
  const role = String(req.user.role || '').toLowerCase();
  const ok = ['admin', 'diretor', 'gestor', 'engenharia', 'manutenção', 'industrial'].some((k) =>
    role.includes(k)
  );
  if (ok) return next();
  return res.status(403).json({ ok: false, error: 'Acesso restrito (área industrial)' });
}

module.exports = { requireIndustrialView, requireIndustrialAdmin };
