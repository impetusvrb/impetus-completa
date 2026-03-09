/**
 * MOTOR DE RESOLUÇÃO DE PERFIL DE DASHBOARD
 * Determina dashboard_profile automaticamente: role + functional_area + job_title
 * Permite override administrativo e fallback seguro
 */

const db = require('../db');
const {
  ROLE_AREA_TO_PROFILE,
  inferAreaFromJobTitle,
  getProfile
} = require('../config/dashboardProfiles');

/** Perfis válidos (whitelist) */
const VALID_PROFILES = new Set([
  'ceo_executive', 'director_operations', 'director_industrial',
  'manager_production', 'manager_maintenance', 'manager_quality',
  'coordinator_production', 'coordinator_maintenance', 'coordinator_quality',
  'supervisor_production', 'supervisor_maintenance', 'supervisor_quality',
  'analyst_pcp', 'technician_maintenance', 'inspector_quality', 'operator_floor',
  'hr_management', 'finance_management', 'admin_system'
]);

/**
 * Resolve functional_area do usuário
 * Prioridade: functional_area > inferência de job_title > role default
 */
function resolveFunctionalArea(user) {
  const fa = (user.functional_area || '').toLowerCase().trim();
  if (fa && ['production', 'maintenance', 'quality', 'operations', 'pcp', 'hr', 'finance', 'admin'].includes(fa)) {
    return fa;
  }
  const inferred = inferAreaFromJobTitle(user.job_title);
  if (inferred) return inferred;
  const role = (user.role || '').toLowerCase();
  if (role === 'ceo' || role === 'diretor') return 'operations';
  if (role === 'admin') return 'admin';
  if (role === 'rh') return 'hr';
  if (role === 'financeiro') return 'finance';
  return 'production'; // fallback
}

/**
 * Resolve dashboard_profile do usuário
 * Regra: DASHBOARD = HIERARQUIA (role) + ÁREA (functional_area)
 * @param {Object} user - usuário com id, role, functional_area, job_title, dashboard_profile (override)
 * @returns {string} profile_code
 */
function resolveDashboardProfile(user) {
  if (!user) return 'operator_floor';

  // Override administrativo (se válido)
  const override = (user.dashboard_profile || '').trim();
  if (override && VALID_PROFILES.has(override)) {
    return override;
  }

  const role = (user.role || '').toLowerCase();
  const area = resolveFunctionalArea(user);

  const roleMap = ROLE_AREA_TO_PROFILE[role];
  if (!roleMap) {
    return role === 'ceo' ? 'ceo_executive' : 'operator_floor';
  }

  const profile = roleMap[area] || roleMap._default;
  return profile || 'operator_floor';
}

/**
 * Resolve e persiste o perfil no usuário (se mudou)
 * @param {Object} user
 * @returns {Promise<{ profile: string, updated: boolean }>}
 */
async function resolveAndPersistProfile(user) {
  const resolved = resolveDashboardProfile(user);
  if (user.dashboard_profile === resolved) {
    return { profile: resolved, updated: false };
  }
  try {
    await db.query(
      'UPDATE users SET dashboard_profile = $1, updated_at = now() WHERE id = $2',
      [resolved, user.id]
    );
    return { profile: resolved, updated: true };
  } catch (err) {
    console.error('[DASHBOARD_PROFILE_RESOLVER] persist error:', err.message);
    return { profile: resolved, updated: false };
  }
}

/**
 * Retorna configuração completa do perfil para o usuário
 */
function getDashboardConfigForUser(user) {
  const profileCode = resolveDashboardProfile(user);
  const profile = getProfile(profileCode);
  return {
    profile_code: profileCode,
    profile_config: profile,
    functional_area: resolveFunctionalArea(user)
  };
}

module.exports = {
  resolveFunctionalArea,
  resolveDashboardProfile,
  resolveAndPersistProfile,
  getDashboardConfigForUser,
  VALID_PROFILES
};
