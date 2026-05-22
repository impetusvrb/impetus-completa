'use strict';

/**
 * Filtra módulos de menu por perfil estrutural (cargo, função, departamento, descrição).
 * Módulos universais permanecem para todos; demais só se compatíveis com o eixo detectado.
 */

const registry = require('../contextualModules/moduleRegistry');
const { interpretProfileContext } = require('./profileContextInterpreter');
const { normalizeStructuralUser } = require('./structuralUserProfileService');
const tenantAdminPortalScope = require('./tenantAdminPortalScope');
const {
  isHrDomainUser,
  isSafetyDomainUser,
  userQualifiesForSafetyDomain,
  userQualifiesForHrDomain
} = require('./structuralDomainAudience');

const UNIVERSAL_MENU_KEYS = Object.freeze(
  registry
    .getAllModules()
    .filter((m) => m.universal === true && m.menu_key)
    .map((m) => m.menu_key)
);

/** Alinhado a dashboardAccessService.UNIVERSAL_SAFE_ACCESS_MODULES */
const SAFE_UNIVERSAL = Object.freeze(['proaction', 'registro_inteligente', 'cadastrar_com_ia']);

/** Chaves que nunca são removidas pelo filtro estrutural (além dos universais do registry). */
const STRUCTURAL_FILTER_BYPASS_KEYS = Object.freeze(['admin', 'audit']);

/** menu_keys sem entrada dedicada no registry — filtro por eixo. */
const DOMAIN_MENU_AXES = Object.freeze({
  logistics_intelligence: ['eixo_logistica', 'eixo_estoque'],
  anomaly_detection: ['eixo_executivo', 'eixo_financeiro', 'eixo_planejamento', 'eixo_operacional']
});

const HR_PROFILES = new Set([
  'hr_management',
  'director_hr',
  'supervisor_hr',
  'coordinator_hr',
  'manager_hr'
]);

/** Domínios que exigem eixo primário (evita vazamento por eixo secundário genérico). */
const DOMAIN_STRICT_MENU_KEYS = Object.freeze(
  new Set([
    'quality_intelligence',
    'safety_intelligence',
    'hr_intelligence',
    'manuia',
    'environment_intelligence',
    'logistics_intelligence',
    'raw_material_lots'
  ])
);

function _isFilterEnabled() {
  const v = String(process.env.IMPETUS_STRUCTURAL_MODULE_FILTER || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

function _shouldBypassFilter(user) {
  if (!user) return true;
  if (tenantAdminPortalScope.isAdministrativePortalOnlyUser(user)) return true;
  const role = String(user.role || '').toLowerCase();
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes('*')) return true;
  if (role === 'admin' || role === 'internal_admin' || role === 'ceo') return true;
  return false;
}

function _isUniversalMenuKey(menuKey) {
  if (!menuKey) return false;
  if (UNIVERSAL_MENU_KEYS.includes(menuKey)) return true;
  if (SAFE_UNIVERSAL.includes(menuKey)) return true;
  if (STRUCTURAL_FILTER_BYPASS_KEYS.includes(menuKey)) return true;
  return false;
}

/**
 * Um menu_key é permitido se alguma definição no registry for universal,
 * não tiver eixos (plataforma geral) ou houver interseção com eixos do utilizador.
 */
/** Perfis de dashboard → módulos permitidos / bloqueados (prioridade sobre eixo secundário). */
function profileOverridesModule(menuKey, user) {
  const prof = String(user.dashboard_profile || '').toLowerCase();
  if (isHrDomainUser(user) || HR_PROFILES.has(prof) || prof.includes('hr')) {
    if (menuKey === 'safety_intelligence') return false;
    if (menuKey === 'quality_intelligence' && !interpretProfileContext(user).axes?.includes('eixo_qualidade')) {
      return false;
    }
    if (menuKey === 'environment_intelligence') return false;
    if (menuKey === 'hr_intelligence') return true;
    if (menuKey === 'manuia') return false;
  }
  if (isSafetyDomainUser(user)) {
    if (menuKey === 'hr_intelligence' && !userQualifiesForHrDomain(user)) return false;
    if (menuKey === 'safety_intelligence') return true;
  }
  if (prof.startsWith('director_') && !prof.includes('hr') && !userQualifiesForSafetyDomain(user)) {
    if (menuKey === 'safety_intelligence') return false;
    if (menuKey === 'hr_intelligence' && !userQualifiesForHrDomain(user)) return false;
  }
  return null;
}

function menuKeyMatchesStructuralProfile(menuKey, interpreted, user) {
  if (_isUniversalMenuKey(menuKey)) return true;

  const override = profileOverridesModule(menuKey, user);
  if (override === true) return true;
  if (override === false) return false;

  const defs = registry.getModulesByMenuKey(menuKey);
  const axisSetEarly = new Set([interpreted.primary_axis, ...(interpreted.axes || [])].filter(Boolean));
  if (!defs.length) {
    const domainAxes = DOMAIN_MENU_AXES[menuKey];
    if (domainAxes) return domainAxes.some((ax) => axisSetEarly.has(ax));
    return true;
  }

  const axisSet = new Set([interpreted.primary_axis, ...(interpreted.axes || [])].filter(Boolean));
  const primary = interpreted.primary_axis || null;
  const resp = new Set(interpreted.responsibilities || []);

  if (DOMAIN_STRICT_MENU_KEYS.has(menuKey)) {
    const domainAxes = DOMAIN_MENU_AXES[menuKey] || [];
    const registryAxes = defs.flatMap((d) => d.compatible_axes || []);
    const requiredAxes = [...new Set([...domainAxes, ...registryAxes])];
    if (primary && requiredAxes.includes(primary)) return true;
    if (menuKey === 'hr_intelligence' && resp.has('pessoas')) return true;
    if (menuKey === 'quality_intelligence' && resp.has('qualidade')) return true;
    if (menuKey === 'manuia' && resp.has('maquina')) return true;
    if (menuKey === 'safety_intelligence' && resp.has('seguranca')) return true;
    if (domainAxes.length && domainAxes.some((ax) => axisSet.has(ax) && ax === primary)) return true;
    return false;
  }

  let hasAxisGatedDef = false;

  for (const def of defs) {
    if (def.universal) return true;

    const compatAxes = Array.isArray(def.compatible_axes) ? def.compatible_axes : [];
    const compatAreas = Array.isArray(def.compatible_areas) ? def.compatible_areas : [];

    if (compatAxes.length === 0 && compatAreas.length === 0) {
      return true;
    }

    if (compatAxes.length > 0) {
      hasAxisGatedDef = true;
      if (compatAxes.some((ax) => axisSet.has(ax))) return true;
    }

    if (compatAreas.length > 0) {
      const area = interpreted.normalized_profile?.area || '';
      const job = interpreted.normalized_profile?.job_title || '';
      const blob = `${area} ${job}`.toLowerCase();
      if (compatAreas.some((a) => blob.includes(String(a).toLowerCase().replace(/_/g, ' ')))) {
        return true;
      }
    }
  }

  if (!hasAxisGatedDef) return true;

  if (menuKey === 'hr_intelligence' && resp.has('pessoas')) return true;
  if (menuKey === 'quality_intelligence' && resp.has('qualidade')) return true;
  if (menuKey === 'manuia' && resp.has('maquina')) return true;
  if (menuKey === 'safety_intelligence' && resp.has('seguranca')) return true;
  if (menuKey === 'logistics_intelligence' && (resp.has('estoque') || axisSet.has('eixo_logistica'))) return true;

  return false;
}

/**
 * @param {object} user
 * @param {string[]} modules
 * @returns {{ modules: string[], removed: string[], kept_universal: string[], structural_axes: string[] }}
 */
function applyStructuralModuleFilter(user, modules) {
  const input = Array.isArray(modules) ? modules.filter(Boolean) : [];
  try {
    const moduleGov = require('./moduleAccessGovernanceEngine');
    if (moduleGov.isEnabled() && !_shouldBypassFilter(user)) {
      return {
        modules: input,
        removed: [],
        kept_universal: input.filter(_isUniversalMenuKey),
        structural_axes: [],
        skipped: true,
        reason: 'delegated_to_module_access_governance_engine'
      };
    }
  } catch (_) { /* fall through */ }
  if (!_isFilterEnabled() || _shouldBypassFilter(user)) {
    return {
      modules: [...new Set(input)],
      removed: [],
      kept_universal: input.filter(_isUniversalMenuKey),
      structural_axes: [],
      skipped: true
    };
  }

  const normalized = normalizeStructuralUser(user);
  const interpreted = interpretProfileContext(normalized);
  const kept = [];
  const removed = [];

  for (const key of input) {
    if (menuKeyMatchesStructuralProfile(key, interpreted, normalized)) {
      kept.push(key);
    } else {
      removed.push(key);
    }
  }

  if (userQualifiesForHrDomain(normalized) && !kept.includes('hr_intelligence')) {
    kept.push('hr_intelligence');
  }

  for (const u of [...UNIVERSAL_MENU_KEYS, ...SAFE_UNIVERSAL]) {
    if (!kept.includes(u)) kept.push(u);
  }

  return {
    modules: [...new Set(kept)],
    removed,
    kept_universal: kept.filter(_isUniversalMenuKey),
    structural_axes: interpreted.axes || [],
    primary_axis: interpreted.primary_axis || null,
    skipped: false
  };
}

module.exports = {
  UNIVERSAL_MENU_KEYS,
  applyStructuralModuleFilter,
  menuKeyMatchesStructuralProfile,
  _isUniversalMenuKey
};
