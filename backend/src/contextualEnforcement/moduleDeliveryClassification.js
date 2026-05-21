'use strict';

/**
 * Classificação canónica de módulos — Etapa 2 Z.1
 * NÃO esconde automaticamente; define política de entrega.
 */
const CLASSIFICATION = Object.freeze({
  STRICT: 'STRICT',
  CONTEXTUAL: 'CONTEXTUAL',
  SHARED: 'SHARED',
  EXECUTIVE_ONLY: 'EXECUTIVE_ONLY',
  OPERATIONAL_ONLY: 'OPERATIONAL_ONLY',
  DOMAIN_ONLY: 'DOMAIN_ONLY',
  TENANT_ONLY: 'TENANT_ONLY',
  CROSS_DOMAIN_RESTRICTED: 'CROSS_DOMAIN_RESTRICTED'
});

const MODULE_RULES = Object.freeze({
  dashboard: { class: CLASSIFICATION.SHARED, domains: ['*'], min_level: 1, max_level: 5 },
  settings: { class: CLASSIFICATION.SHARED, domains: ['*'] },
  biblioteca: { class: CLASSIFICATION.SHARED, domains: ['*'] },
  ai: { class: CLASSIFICATION.SHARED, domains: ['*'] },
  chat: { class: CLASSIFICATION.SHARED, domains: ['*'] },
  operational: { class: CLASSIFICATION.SHARED, domains: ['*'], note: 'controlled_shared' },
  proaction: { class: CLASSIFICATION.SHARED, domains: ['*'] },
  hr_intelligence: { class: CLASSIFICATION.DOMAIN_ONLY, domains: ['hr'] },
  environment_intelligence: { class: CLASSIFICATION.DOMAIN_ONLY, domains: ['environmental', 'sustainability'], labels: ['Emissões'] },
  safety_intelligence: { class: CLASSIFICATION.STRICT, domains: ['safety', 'environmental_health_safety'], labels: ['SST', 'APR', 'PT', 'LOTO'] },
  quality_intelligence: { class: CLASSIFICATION.DOMAIN_ONLY, domains: ['quality'] },
  manuia: { class: CLASSIFICATION.OPERATIONAL_ONLY, domains: ['maintenance', 'industrial', 'production'], min_level: 3 },
  anomaly_detection: { class: CLASSIFICATION.OPERATIONAL_ONLY, domains: ['industrial', 'production', 'maintenance'], min_level: 3 },
  raw_material_lots: { class: CLASSIFICATION.DOMAIN_ONLY, domains: ['quality', 'logistics'] },
  audit: { class: CLASSIFICATION.EXECUTIVE_ONLY, domains: ['*'], min_level: 1, max_level: 2 },
  admin: { class: CLASSIFICATION.EXECUTIVE_ONLY, domains: ['*'], min_level: 1, max_level: 2 },
  esg: { class: CLASSIFICATION.EXECUTIVE_ONLY, domains: ['environmental', 'sustainability', 'esg'], min_level: 1, max_level: 2 },
  emissions: { class: CLASSIFICATION.DOMAIN_ONLY, domains: ['environmental'], labels: ['Emissões'] },
  pilot: { class: CLASSIFICATION.TENANT_ONLY, domains: ['*'], tenant_flag: 'pilot_enabled' },
  registro_inteligente: { class: CLASSIFICATION.CONTEXTUAL, domains: ['*'] },
  cadastrar_com_ia: { class: CLASSIFICATION.CONTEXTUAL, domains: ['*'] }
});

function classifyModule(moduleId) {
  const key = String(moduleId || '').toLowerCase();
  const rule = MODULE_RULES[key];
  if (!rule) {
    return { module_id: key, classification: CLASSIFICATION.CONTEXTUAL, inferred: true };
  }
  return { module_id: key, ...rule, classification: rule.class, inferred: false };
}

function classifyModuleList(modules = []) {
  return modules.map(classifyModule);
}

function isModuleAllowedForContext(moduleId, ctx = {}) {
  const c = classifyModule(moduleId);
  const axis = String(ctx.domain_axis || ctx.functional_axis || '').toLowerCase();
  const level = ctx.hierarchy_level ?? 3;
  const tenantPilot = ctx.tenant_pilot_enabled === true;

  if (c.classification === CLASSIFICATION.TENANT_ONLY && !tenantPilot) {
    return { allowed: false, reason: 'tenant_pilot_required', simulation_only: true };
  }
  if (c.classification === CLASSIFICATION.EXECUTIVE_ONLY && level > 2) {
    return { allowed: false, reason: 'executive_only', simulation_only: true };
  }
  if (c.classification === CLASSIFICATION.OPERATIONAL_ONLY && level <= 2) {
    return { allowed: false, reason: 'operational_only', simulation_only: true };
  }
  if (c.classification === CLASSIFICATION.DOMAIN_ONLY && c.domains && !c.domains.includes('*')) {
    const ok = c.domains.some((d) => axis === d || axis.includes(d));
    if (!ok) return { allowed: false, reason: 'domain_only', domains: c.domains, simulation_only: true };
  }
  if (c.classification === CLASSIFICATION.STRICT && c.domains?.length) {
    const ok = c.domains.some((d) => axis === d || axis.includes(d));
    if (!ok) return { allowed: false, reason: 'strict_domain', simulation_only: true };
  }
  return { allowed: true, classification: c.classification, enforcement_applied: false };
}

module.exports = {
  CLASSIFICATION,
  MODULE_RULES,
  classifyModule,
  classifyModuleList,
  isModuleAllowedForContext
};
