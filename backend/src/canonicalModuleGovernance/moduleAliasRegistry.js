'use strict';

/** Normaliza IDs abstractos (spec) → menu_key / module_id runtime. */
const MODULE_ALIASES = Object.freeze({
  quality_operational: 'quality_intelligence',
  quality_contextual_intelligence: 'quality_intelligence',
  inspections: 'quality_intelligence',
  ncr_capa: 'quality_intelligence',
  spc: 'quality_intelligence',
  supplier_quality: 'quality_intelligence',
  industrial_telemetry: 'quality_intelligence',
  apr_pt_loto: 'safety_intelligence',
  telemetria_sst: 'safety_intelligence',
  incidents: 'safety_intelligence',
  ghe: 'safety_intelligence',
  epi_epc: 'safety_intelligence',
  safety_governance: 'safety_intelligence',
  safety_operational: 'safety_intelligence',
  environmental_governance: 'environment_intelligence',
  esg_environmental: 'environment_intelligence',
  ete_eta: 'environment_intelligence',
  residues: 'environment_intelligence',
  executive_esg: 'esg',
  onboarding: 'hr_intelligence',
  people_analytics: 'hr_intelligence',
  rh_governance: 'hr_intelligence',
  training: 'hr_intelligence',
  governance: 'audit',
  executive_dashboard: 'dashboard',
  strategic_kpis: 'operational',
  sustainability: 'esg',
  maturity: 'operational',
  consolidated_runtime: 'operational',
  cockpit_operacional_bruto: 'operational',
  apr_execution: 'safety_intelligence',
  raw_operational_telemetry: 'anomaly_detection',
  help: 'settings',
  notifications: 'settings'
});

const PUBLICATION_DOMAINS = Object.freeze({
  safety: ['safety_intelligence', '_safety_publication'],
  environment: ['environment_intelligence', '_environment_publication'],
  quality: ['quality_intelligence', '_quality_publication'],
  logistics: ['logistics_intelligence', '_logistics_publication']
});

function normalizeModuleId(moduleId) {
  const key = String(moduleId || '').toLowerCase().trim();
  return MODULE_ALIASES[key] || key;
}

function expandDenyList(denyList = []) {
  const out = new Set();
  for (const id of denyList) {
    const n = normalizeModuleId(id);
    out.add(n);
    out.add(id);
  }
  return out;
}

module.exports = { MODULE_ALIASES, PUBLICATION_DOMAINS, normalizeModuleId, expandDenyList };
