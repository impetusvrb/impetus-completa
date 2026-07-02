'use strict';

/**
 * Governança formal de herança EHS (Fase D).
 * Níveis: shared | restricted | exclusive
 */

const INHERITANCE = Object.freeze({
  SHARED: 'shared',
  RESTRICTED: 'restricted',
  EXCLUSIVE: 'exclusive'
});

/** module_or_manifest_id → { level, owner_axis, shared_with? } */
const MODULE_INHERITANCE_CATALOG = Object.freeze({
  telemetry_core: { level: INHERITANCE.SHARED, owner_axis: 'operations', shared_with: ['safety', 'environmental', 'maintenance'] },
  audit: { level: INHERITANCE.SHARED, owner_axis: 'governance', shared_with: ['safety', 'environmental', 'finance', 'quality'] },
  operational: { level: INHERITANCE.SHARED, owner_axis: 'operations', shared_with: ['safety', 'environmental'] },

  safety_intelligence: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  incident_management: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  epi_management: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  permit_to_work: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  risk_matrix: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  behavioral_safety: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  safety_compliance: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  nr_governance: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  critical_alerts: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },
  occupational_health: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'safety' },

  environment_intelligence: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  emissions: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  gee: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  waste_management: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  environmental_compliance: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  environmental_runtime: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'environmental' },
  esg_corporate: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental', shared_with: ['sustainability', 'esg'] },
  carbon_inventory: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental', shared_with: ['sustainability'] },
  ete_management: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental', shared_with: ['utilities'] },
  utilities_consumption: { level: INHERITANCE.RESTRICTED, owner_axis: 'utilities', shared_with: ['environmental'] },

  environment_esg: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_emissions: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_telemetry: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_cognitive: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_executive: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_governance: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_carbon: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_sustainability: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_effluent: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_water: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_waste: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_field: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_rollout: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },
  environment_intelligence_manifest: { level: INHERITANCE.RESTRICTED, owner_axis: 'environmental' },

  quality_intelligence: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'quality' },
  spc: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'quality' },
  capa_quality: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'quality' },

  manuia: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'maintenance' },
  hr_intelligence: { level: INHERITANCE.EXCLUSIVE, owner_axis: 'hr', shared_with: ['executive', 'governance'] }
});

const SAFETY_DENIED_MANIFEST_PREFIXES = Object.freeze([
  'environment_esg',
  'environment_emissions',
  'environment_telemetry',
  'environment_cognitive',
  'environment_executive',
  'environment_governance',
  'environment_carbon',
  'environment_sustainability',
  'environment_effluent',
  'environment_water',
  'environment_waste',
  'environment_field',
  'environment_rollout',
  'environment_intelligence'
]);

const EHS_SHARED_AXIS = Object.freeze({
  axis: 'ehs_shared',
  shared_modules: ['telemetry_core', 'audit', 'operational', 'proaction', 'biblioteca', 'ai', 'dashboard', 'settings'],
  note: 'Cross-cutting EHS only — never full environmental corporate stack'
});

function getInheritanceEntry(id) {
  const k = String(id || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  return MODULE_INHERITANCE_CATALOG[k] || null;
}

function isManifestAllowedForAxis(manifestId, axis) {
  const a = String(axis || '').toLowerCase();
  const id = String(manifestId || '').toLowerCase();
  if (!id) return true;

  if (a === 'safety') {
    if (SAFETY_DENIED_MANIFEST_PREFIXES.some((p) => id === p || id.startsWith(p))) return false;
    if (/environment_|esg|emission|carbon|gee|ete|eta|waste|effluent|sustainability/.test(id)) return false;
  }

  if (a === 'environmental' || a === 'sustainability' || a === 'esg' || a === 'utilities') {
    if (/incident_safety|epi_|ptw|sst|nr_|behavioral_safety|safety_operational/.test(id)) return false;
  }

  if (a === 'quality') {
    if (/environment_|esg|emission|safety_/.test(id)) return false;
  }

  const entry = getInheritanceEntry(id);
  if (!entry) return true;
  if (entry.level === INHERITANCE.SHARED) {
    return entry.shared_with?.includes(a) || entry.owner_axis === a;
  }
  if (entry.level === INHERITANCE.EXCLUSIVE) return entry.owner_axis === a;
  if (entry.level === INHERITANCE.RESTRICTED) {
    return entry.owner_axis === a || (entry.shared_with || []).includes(a);
  }
  return true;
}

module.exports = {
  INHERITANCE,
  MODULE_INHERITANCE_CATALOG,
  SAFETY_DENIED_MANIFEST_PREFIXES,
  EHS_SHARED_AXIS,
  getInheritanceEntry,
  isManifestAllowedForAxis
};
