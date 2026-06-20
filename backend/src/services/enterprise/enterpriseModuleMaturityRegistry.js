'use strict';

/**
 * M1.19 — Registo canónico de maturidade enterprise dos módulos promovidos.
 */

const PROMOTED_M1_19 = Object.freeze([
  { id: 'quality_cognitive', name: 'Quality Cognitive', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'safety_cognitive', name: 'Safety Cognitive', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'environment_telemetry', name: 'Environment Telemetry', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'centro_previsao', name: 'Centro de Previsão', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'centro_custos', name: 'Centro de Custos', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'mapa_vazamentos', name: 'Mapa de Vazamentos', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
  { id: 'integracoes_mes_erp', name: 'Integrações MES/ERP', maturity: 'Enterprise Ready', promoted_at: '2026-06-28', phase: 'M1.19' },
]);

const EXCLUDED_M1_19 = Object.freeze([
  'Environment Operational',
  'Environment Governance',
  'Environment Executive',
  'Cockpits ESG',
  'Analytics Foundation',
  'Logistics Foundation',
  'MES Foundation',
  'Workflow BPMN',
]);

function getPromotedModules() {
  return PROMOTED_M1_19.map((m) => ({ ...m }));
}

function getModuleMaturity(moduleIdOrName) {
  const key = String(moduleIdOrName || '').toLowerCase().replace(/\s+/g, '_');
  const found = PROMOTED_M1_19.find(
    (m) => m.id === key || m.name.toLowerCase().replace(/\s+/g, '_') === key
  );
  return found ? found.maturity : null;
}

function isEnterpriseReady(moduleIdOrName) {
  return getModuleMaturity(moduleIdOrName) === 'Enterprise Ready';
}

module.exports = {
  PROMOTED_M1_19,
  EXCLUDED_M1_19,
  getPromotedModules,
  getModuleMaturity,
  isEnterpriseReady,
};
