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
const functionalAxisResolver = require('./functionalAxisResolver');

let _domainAuthority = null;
function _getDomainAuthority() {
  if (_domainAuthority !== null) return _domainAuthority;
  try {
    _domainAuthority = require('../domainAuthority');
  } catch {
    _domainAuthority = false;
  }
  return _domainAuthority;
}

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Texto agregado para inferência (inclui nome do departamento quando só há department_id). */
function contextualTextForInference(user) {
  if (!user) return '';
  return [user.department, user.area, user.department_resolved_name]
    .filter((x) => x && String(x).trim())
    .join(' ');
}

function inferAreaFromFreeText(text) {
  const catalog = require('../config/functionalAreaCatalog');
  const fromCatalog = catalog.resolveIdFromText(text);
  if (fromCatalog) return fromCatalog;
  const t = normalizeText(text);
  if (!t) return null;
  if (
    /(recursos humanos|gestao de pessoas|human resources|people operations|people and culture|people & culture|hrbp|rh\b|absenteismo|turnover|treinamento|clima organizacional)/.test(
      t
    )
  ) {
    return 'hr';
  }
  if (/(finance|custo|despesa|margem|fluxo de caixa|inadimplencia)/.test(t)) return 'finance';
  if (/(manutenc|pcm|mttr|mtbf|ordem de servico|mecanic|eletric)/.test(t)) return 'maintenance';
  if (/(qualidade|nao conform|inspec|desvio)/.test(t) && !catalog.hasEnvironmentalSemanticSignal(t)) return 'quality';
  if (/(meio ambiente|ambiental|sustentabil|esg|efluente|residuo|emissao|eta|ete)/.test(t)) return 'environmental';
  if (/\bpcp\b|planejamento/.test(t)) return 'pcp';
  if (/(operac|industrial|executiv)/.test(t)) return 'operations';
  if (/(produc|linha|turno|refugo|eficiencia)/.test(t)) return 'production';
  if (/(administra|administrativo)/.test(t)) return 'admin';
  if (/(laboratorio|microbio)/.test(t) && !catalog.hasEnvironmentalSemanticSignal(t)) return 'laboratory';
  return null;
}

/** Roles em inglês na BD → chaves de ROLE_AREA_TO_PROFILE (PT). */
function normalizeRoleForDashboardProfile(roleRaw) {
  const r = String(roleRaw || '')
    .toLowerCase()
    .trim();
  if (r === 'director' || r === 'directora') return 'diretor';
  if (r === 'manager') return 'gerente';
  if (r === 'coordinator' || r === 'coordinador') return 'coordenador';
  return r;
}

/** Perfis válidos (whitelist) */
const VALID_PROFILES = new Set([
  'ceo_executive', 'director_operations', 'director_industrial', 'director_unassigned',
  'director_hr', 'director_financial', 'director_safety',
  'manager_production', 'manager_maintenance', 'manager_quality', 'manager_environmental',
  'manager_hr', 'manager_financial', 'manager_logistics', 'manager_engineering',
  'manager_safety', 'manager_compliance', 'manager_legal', 'manager_operations',
  'coordinator_production', 'coordinator_maintenance', 'coordinator_quality', 'coordinator_environmental',
  'coordinator_hr', 'coordinator_financial', 'coordinator_logistics', 'coordinator_engineering',
  'coordinator_safety', 'coordinator_compliance', 'coordinator_legal', 'coordinator_operations',
  'supervisor_production', 'supervisor_maintenance', 'supervisor_quality', 'supervisor_environmental',
  'supervisor_hr', 'supervisor_financial', 'supervisor_logistics', 'supervisor_engineering',
  'supervisor_safety', 'supervisor_compliance', 'supervisor_legal', 'supervisor_operations',
  'analyst_pcp', 'technician_maintenance', 'inspector_quality', 'operator_floor',
  'hr_management', 'finance_management', 'admin_system'
]);

const { FUNCTIONAL_AREA_IDS } = require('../config/functionalAreaCatalog');
const KNOWN_FUNCTIONAL_AREAS = FUNCTIONAL_AREA_IDS;

/**
 * Resolve functional_area do usuário (delega ao functionalAxisResolver).
 */
function resolveFunctionalArea(user) {
  return functionalAxisResolver.resolveFunctionalArea(user);
}

/**
 * Resolve dashboard_profile do usuário
 * Regra: DASHBOARD = HIERARQUIA (role) + ÁREA (functional_area)
 * @param {Object} user - usuário com id, role, functional_area, job_title, dashboard_profile (override)
 * @returns {string} profile_code
 */
function resolveDashboardProfile(user) {
  if (!user) return 'operator_floor';

  const override = (user.dashboard_profile || '').trim();
  const role = normalizeRoleForDashboardProfile(user.role);
  const area = resolveFunctionalArea(user);

  // Perfil persistido (ex.: finance_management) ganha prioridade quando a área não foi inferida.
  if ((area == null || area === '') && override && VALID_PROFILES.has(override)) {
    return override;
  }

  const hasStrongContext =
    String(user.job_title || '').trim().length > 1 ||
    String(user.functional_area || user.company_role_dashboard_hint || '').trim().length > 0 ||
    String(user.department || user.area || user.department_resolved_name || '').trim().length > 1;
  if (!hasStrongContext && override && VALID_PROFILES.has(override)) {
    return override;
  }

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
  const da = _getDomainAuthority();
  const axisPack =
    da && da.isDomainAuthorityEnabled() ?
      da.semanticDomainResolver.resolveSemanticAxis(user) :
      functionalAxisResolver.resolveFunctionalAxis(user);
  const profileCode = resolveDashboardProfile({ ...user, functional_area: axisPack.functional_area });
  const profile = getProfile(profileCode);
  let config = {
    profile_code: profileCode,
    profile_config: profile,
    functional_area: axisPack.functional_area,
    functional_axis: axisPack.functional_axis,
    functional_area_label: axisPack.functional_area_label,
    functional_area_source: axisPack.source,
    contextual_modules_hint: functionalAxisResolver.getContextualModulesForAxis(axisPack.functional_axis),
    inference_trace: axisPack.inference_trace
  };
  if (da && da.isDomainAuthorityEnabled()) {
    config = da.applyGovernanceToDashboardConfig(user, config);
  }
  return config;
}

module.exports = {
  resolveFunctionalArea,
  resolveDashboardProfile,
  resolveAndPersistProfile,
  getDashboardConfigForUser,
  VALID_PROFILES,
  contextualTextForInference
};
