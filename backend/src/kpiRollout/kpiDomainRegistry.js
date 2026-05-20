'use strict';

/** Domínios canónicos e tags de KPI permitidas por eixo */
const DOMAIN_AXES = [
  'executive',
  'operations',
  'quality',
  'safety',
  'environmental',
  'financial',
  'hr',
  'logistics',
  'general'
];

const HIERARCHY_BANDS = ['executive', 'director', 'coordinator', 'supervisor', 'operator', 'staff'];

/** KPI domain → eixos onde NÃO deve aparecer (cross-domain leakage) */
const FORBIDDEN_CROSS_DOMAIN = {
  executive: ['operator', 'staff'],
  financial: ['operator', 'safety', 'environmental'],
  quality: ['hr', 'financial'],
  environmental: ['hr', 'financial'],
  safety: ['financial', 'hr'],
  hr: ['operations', 'quality', 'safety', 'environmental'],
  operations: ['executive', 'financial'],
  logistics: ['hr', 'executive']
};

function normalizeAxis(axis) {
  return String(axis || 'general').toLowerCase().replace(/\s+/g, '_');
}

function inferKpiDomain(kpi) {
  const d = kpi.domain || kpi.axis || kpi.functional_axis || kpi.category;
  if (d) return normalizeAxis(d);
  const id = String(kpi.id || kpi.key || kpi.name || '').toLowerCase();
  if (/exec|board|strategic/.test(id)) return 'executive';
  if (/financ|revenue|cost|margin/.test(id)) return 'financial';
  if (/qual|defect|nc|inspec/.test(id)) return 'quality';
  if (/sst|safety|incident|lti/.test(id)) return 'safety';
  if (/ambient|emiss|waste|esg/.test(id)) return 'environmental';
  if (/hr|people|headcount|turnover/.test(id)) return 'hr';
  if (/logist|supply|inventory|freight/.test(id)) return 'logistics';
  if (/oee|prod|line|throughput/.test(id)) return 'operations';
  return 'general';
}

module.exports = {
  DOMAIN_AXES,
  HIERARCHY_BANDS,
  FORBIDDEN_CROSS_DOMAIN,
  normalizeAxis,
  inferKpiDomain
};
