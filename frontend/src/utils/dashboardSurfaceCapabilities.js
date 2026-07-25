/**
 * INC-009 / INC-022 — Política canónica de superfícies do dashboard integrado.
 *
 * Separa:
 * - MODULE ACCESS (visible_modules, eixos secundários)
 * - DASHBOARD SURFACE ACCESS (composição de componentes)
 * - DATA SCOPE (APIs / filtros hierárquicos)
 *
 * Fail-closed: perfis ambiental ou qualidade primários nunca recebem superfície
 * de manutenção por eixo secundário, heurística `tecnic` ou módulo `operational` genérico.
 */

const MAINTENANCE_PROFILE_PATTERN =
  /maintenance|technician_maintenance|manager_maintenance|coordinator_maintenance|supervisor_maintenance/i;

const ENVIRONMENTAL_PROFILE_PATTERN =
  /environmental|coordinator_environmental|manager_environmental|supervisor_environmental/i;

const QUALITY_PROFILE_PATTERN =
  /quality|inspector_quality|manager_quality|coordinator_quality|supervisor_quality/i;

const QUALITY_CONTEXT_PATTERN =
  /qualidade|nao conform|inspec|conformidade|laboratorio/;

const MAINTENANCE_HEURISTIC_PATTERN =
  /maintenance|manuten|mecan|eletric|eletromecan|soldad|tecnic|technician_maintenance|manager_maintenance|coordinator_maintenance|supervisor_maintenance/i;

function norm(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function readStructural(user) {
  return user?.structural_profile && typeof user.structural_profile === 'object'
    ? user.structural_profile
    : null;
}

function isExecutiveSurface(user) {
  if (!user) return false;
  const profile = norm(user.dashboard_profile);
  if (profile === 'ceo_executive') return true;
  const sp = readStructural(user);
  if (sp?.eixo_primario === 'eixo_executivo') return true;
  const fa = norm(user.functional_area || user.area || user.department);
  if (fa !== 'executive') return false;
  const role = norm(user.role);
  return ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor', 'director', 'manager', 'coordinator'].includes(role);
}

export function isEnvironmentalPrimary(user) {
  if (!user) return false;
  const profile = norm(user.dashboard_profile);
  const fa = norm(user.functional_area || user.area || user.department);
  const sp = readStructural(user);
  if (ENVIRONMENTAL_PROFILE_PATTERN.test(profile)) return true;
  if (fa === 'environmental' || fa.includes('meio ambiente') || fa.includes('ambiental')) return true;
  if (sp?.eixo_primario === 'eixo_ambiental' || sp?.eixo_primario === 'eixo_sustentabilidade') return true;
  return false;
}

/** Perfil/cargo/área de qualidade primário — bloqueia superfície de manutenção (INC-022). */
export function isQualityPrimary(user) {
  if (!user) return false;
  const profile = norm(user.dashboard_profile);
  const fa = norm(user.functional_area || user.area || user.department);
  const jobTitle = norm(user.job_title || user.cargo);
  const sp = readStructural(user);
  if (QUALITY_PROFILE_PATTERN.test(profile)) return true;
  if (fa === 'quality' || fa === 'qualidade' || fa === 'laboratory' || fa === 'laboratorio') return true;
  if (sp?.eixo_primario === 'eixo_qualidade' || sp?.eixo_primario === 'eixo_laboratorial') return true;
  if (QUALITY_CONTEXT_PATTERN.test(jobTitle)) return true;
  return false;
}

function isMaintenanceHeuristic(user) {
  if (!user) return false;
  if (isQualityPrimary(user)) return false;
  const role = norm(user.role);
  const area = norm(user.functional_area || user.area || user.department);
  const jobTitle = norm(user.job_title || user.cargo);
  const profile = norm(user.dashboard_profile);
  return (
    MAINTENANCE_HEURISTIC_PATTERN.test(role) ||
    MAINTENANCE_HEURISTIC_PATTERN.test(area) ||
    MAINTENANCE_HEURISTIC_PATTERN.test(jobTitle) ||
    MAINTENANCE_HEURISTIC_PATTERN.test(profile)
  );
}

function isMaintenancePrimary(user) {
  if (!user) return false;
  if (isQualityPrimary(user)) return false;
  const profile = norm(user.dashboard_profile);
  const fa = norm(user.functional_area || user.area || user.department);
  const sp = readStructural(user);
  if (MAINTENANCE_PROFILE_PATTERN.test(profile)) return true;
  if (fa === 'maintenance' || fa.includes('manutenc')) return true;
  if (sp?.eixo_primario === 'eixo_manutencao') return true;
  return isMaintenanceHeuristic(user);
}

/**
 * @param {object|null|undefined} user
 * @param {{ maintenanceFromProfile?: boolean }} [options]
 */
export function resolveDashboardSurfaceCapabilities(user, options = {}) {
  const maintenanceFromProfile = options.maintenanceFromProfile === true;
  const environmental = isEnvironmentalPrimary(user);
  const executive = isExecutiveSurface(user);
  const quality = isQualityPrimary(user);
  const maintenancePrimary = maintenanceFromProfile || isMaintenancePrimary(user);

  const maintenance = !environmental && !executive && !quality && maintenancePrimary;

  return {
    maintenance,
    executive,
    environmental,
    quality,
    maintenancePrimary,
    /** Superfície Centro de Comando / widgets executivos (não manutenção). */
    commandCenter: !maintenance
  };
}

/** Gate único para composição DashboardMecanico e painéis exclusivos de manutenção. */
export function hasMaintenanceDashboardSurface(user, maintenanceFromProfile = false) {
  return resolveDashboardSurfaceCapabilities(user, { maintenanceFromProfile }).maintenance;
}

/**
 * Deriva maintenanceFromProfile a partir de GET /dashboard/me — alinhado à política de superfície.
 * Usa apenas eixo primário estrutural, nunca eixos secundários de keyword parsing.
 */
export function resolveMaintenanceFromDashboardMe(payload, mergedUser) {
  if (!payload || typeof payload !== 'object') return false;
  const user = mergedUser || {};
  const profileCode = norm(payload.profile_code || user.dashboard_profile);
  const functionalArea = norm(
    payload.user_context?.functional_area ||
      payload.functional_area ||
      payload.module_access_context?.functional_area ||
      user.functional_area
  );
  const structural = payload.structural_profile || user.structural_profile;

  if (isEnvironmentalPrimary({ ...user, dashboard_profile: profileCode, functional_area: functionalArea, structural_profile: structural })) {
    return false;
  }
  if (isExecutiveSurface({ ...user, dashboard_profile: profileCode, functional_area: functionalArea, structural_profile: structural })) {
    return false;
  }
  if (isQualityPrimary({ ...user, dashboard_profile: profileCode, functional_area: functionalArea, structural_profile: structural })) {
    return false;
  }

  return (
    profileCode.includes('maintenance') ||
    functionalArea === 'maintenance' ||
    functionalArea.includes('manutenc') ||
    structural?.eixo_primario === 'eixo_manutencao'
  );
}
