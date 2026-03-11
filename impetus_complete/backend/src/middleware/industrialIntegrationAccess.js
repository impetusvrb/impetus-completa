/**
 * IMPETUS - Controle de Acesso do Módulo de Integração Industrial
 *
 * VISUALIZAÇÃO: Administrador, Diretor, Supervisor, Engenharia, Manutenção
 * CONFIGURAÇÃO: Apenas role = admin (alterações estruturais)
 */
const { logAction } = require('./audit');

const VIEW_ROLES = ['admin', 'diretor', 'gerente', 'coordenador', 'supervisor'];
const VIEW_HIERARCHY_MAX = 4;
const CONFIG_ROLE = 'admin';

function isAdmin(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'admin' || role === 'internal_admin';
}

function canViewIndustrial(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const hierarchy = user.hierarchy_level ?? 5;
  const functionalArea = (user.functional_area || '').toLowerCase();
  const jobTitle = (user.job_title || '').toLowerCase();

  if (isAdmin(user)) return true;
  if (VIEW_ROLES.includes(role)) return true;
  if (hierarchy <= VIEW_HIERARCHY_MAX) return true;
  if (functionalArea === 'maintenance' || functionalArea === 'manutencao') return true;
  if (functionalArea === 'operations' || jobTitle.includes('engenhei')) return true;
  if (/mecanico|eletricista|eletromecanico|tecnico|manutencao/i.test(jobTitle)) return true;

  return false;
}

function canConfigureIndustrial(user) {
  return isAdmin(user);
}

/**
 * Middleware: exige permissão para VISUALIZAR Integração Industrial
 * status, eventos, perfis, alertas, automação (leitura)
 */
function requireIndustrialView(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }

  if (!canViewIndustrial(user)) {
    logAction({
      companyId: user.company_id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'access_denied',
      entityType: 'industrial_integration',
      description: 'Tentativa de acesso ao módulo Integração Industrial sem permissão de visualização',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
      success: false
    });
    return res.status(403).json({
      ok: false,
      error: 'Permissão insuficiente. O módulo Integração Industrial é restrito a Administrador, Diretor, Supervisor, Engenharia ou Manutenção.',
      code: 'INDUSTRIAL_VIEW_DENIED'
    });
  }

  next();
}

/**
 * Middleware: exige permissão para CONFIGURAR Integração Industrial
 * cadastrar máquinas, sensores, CLP, monitoramento acústico, limites, automações
 */
function requireIndustrialAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }

  if (!canConfigureIndustrial(user)) {
    logAction({
      companyId: user.company_id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'access_denied',
      entityType: 'industrial_integration',
      description: 'Tentativa de configuração no módulo Integração Industrial sem permissão (requer ADMIN)',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
      success: false
    });
    return res.status(403).json({
      ok: false,
      error: 'Permissão insuficiente. Apenas Administrador pode configurar máquinas, sensores, CLP e automações.',
      code: 'INDUSTRIAL_CONFIG_DENIED'
    });
  }

  next();
}

module.exports = {
  requireIndustrialView,
  requireIndustrialAdmin,
  canViewIndustrial,
  canConfigureIndustrial
};
