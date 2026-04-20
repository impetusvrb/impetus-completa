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

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeRole(role) {
  const r = normalizeText(role);
  if (r === 'director' || r === 'diretora') return 'diretor';
  if (r === 'manager') return 'gerente';
  if (r === 'coordinator') return 'coordenador';
  return r;
}

function inferAreaFromFreeText(text) {
  const t = normalizeText(text);
  if (!t) return null;
  if (/(recursos humanos|gestao de pessoas|rh\b|absenteismo|turnover|treinamento|clima organizacional)/.test(t)) return 'hr';
  if (/(finance|custo|despesa|margem|fluxo de caixa|inadimplencia)/.test(t)) return 'finance';
  if (/(manutenc|pcm|mttr|mtbf|ordem de servico|mecanic|eletric)/.test(t)) return 'maintenance';
  if (/(qualidade|nao conform|inspec|laboratorio|microbio|desvio)/.test(t)) return 'quality';
  if (/\bpcp\b|planejamento/.test(t)) return 'pcp';
  if (/(operac|industrial|diretoria|executiv)/.test(t)) return 'operations';
  if (/(produc|linha|turno|refugo|eficiencia)/.test(t)) return 'production';
  if (/(administra|administrativo)/.test(t)) return 'admin';
  return null;
}

function inferAreaFromStructuralRoleName(structuralRoleName) {
  const t = normalizeText(structuralRoleName);
  if (!t) return null;
  if (/(recursos humanos|gestao de pessoas|rh\b|human resources|people ops|people operations|hrbp)/.test(t)) return 'hr';
  if (/(finance|contab|fiscal|tesouraria|controladoria|custo)/.test(t)) return 'finance';
  if (/(manutenc|pcm|mecanic|eletric|eletromecan)/.test(t)) return 'maintenance';
  if (/(qualidade|inspec|laborat|metrolog|nao conform)/.test(t)) return 'quality';
  if (/\bpcp\b|planejamento/.test(t)) return 'pcp';
  if (/(logistica|expedicao|transporte|frete)/.test(t)) return 'operations';
  if (/(almox|estoque|inventario|suprimentos)/.test(t)) return 'operations';
  if (/(produc|linha|chao de fabrica|operac)/.test(t)) return 'production';
  if (/(diretoria|executiv|diretor|ceo)/.test(t)) return 'operations';
  return null;
}

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
  // ORDEM DEFINIDA: função -> departamento -> cargo base estrutural -> descrição -> demais sinais.
  // Aqui resolve apenas o eixo de área (departamento + contexto).
  const fa = normalizeText(user.functional_area);
  if (fa && ['production', 'maintenance', 'quality', 'operations', 'pcp', 'hr', 'finance', 'admin'].includes(fa)) return fa;

  const inferredByDept = inferAreaFromFreeText(
    `${user.department || ''} ${user.area || ''} ${user.functional_area || ''}`.trim()
  );
  if (inferredByDept) return inferredByDept;

  const inferredByStructuralRole = inferAreaFromStructuralRoleName(
    user.company_role_name || user.structural_role_name || ''
  );
  if (inferredByStructuralRole) return inferredByStructuralRole;

  const inferredByDescription = inferAreaFromFreeText(user.hr_responsibilities || user.descricao || user.descricao_funcional || '');
  if (inferredByDescription) return inferredByDescription;

  const inferred = inferAreaFromJobTitle(user.job_title) || inferAreaFromFreeText(user.job_title);
  if (inferred) return inferred;

  const role = normalizeRole(user.role);
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

  // Override só é respeitado quando não há contexto funcional suficiente.
  // Isso evita perfil "travado" antigo que diverge do cargo/função atual.
  const override = (user.dashboard_profile || '').trim();
  const hasStrongContext =
    String(user.job_title || '').trim().length > 1 ||
    String(user.functional_area || '').trim().length > 0 ||
    String(user.department || user.area || '').trim().length > 1;
  if (!hasStrongContext && override && VALID_PROFILES.has(override)) {
    return override;
  }

  const role = normalizeRole(user.role);
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
