/**
 * Acesso à Biblioteca Técnica (ManuIA): leitura ampla; edição restrita.
 */
const { resolveDashboardProfile } = require('../../../services/dashboardProfileResolver');

const MAINTENANCE_PROFILES = new Set([
  'technician_maintenance',
  'supervisor_maintenance',
  'coordinator_maintenance',
  'manager_maintenance'
]);

function isMaintenanceProfile(user) {
  const profile = resolveDashboardProfile(user);
  const profileStr = String(profile || '');
  if (MAINTENANCE_PROFILES.has(profile)) return true;
  return profileStr.includes('maintenance') || profileStr.includes('manutencao');
}

/** Leitura: admin ou qualquer perfil ManuIA (manutenção) */
function requireTechnicalLibraryReader(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }
  const role = (user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return next();
  if (isMaintenanceProfile(user)) return next();
  return res.status(403).json({
    ok: false,
    error: 'Acesso restrito à equipe de manutenção ou administradores',
    code: 'TECH_LIB_READ_DENIED'
  });
}

const EDITOR_PROFILES = new Set([
  'manager_maintenance',
  'coordinator_maintenance',
  'supervisor_maintenance',
  'admin_system'
]);

/** Escrita: admin ou liderança de manutenção */
function requireTechnicalLibraryEditor(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }
  const role = (user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return next();
  if (['diretor', 'gerente'].includes(role) && isMaintenanceProfile(user)) return next();
  const p = resolveDashboardProfile(user);
  if (EDITOR_PROFILES.has(p)) return next();
  return res.status(403).json({
    ok: false,
    error: 'Sem permissão para alterar a biblioteca técnica',
    code: 'TECH_LIB_EDIT_DENIED'
  });
}

module.exports = {
  requireTechnicalLibraryReader,
  requireTechnicalLibraryEditor,
  isMaintenanceProfile
};
