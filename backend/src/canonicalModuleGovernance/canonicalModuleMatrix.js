'use strict';

const { expandDenyList } = require('./moduleAliasRegistry');

const UNIVERSAL_SHARED = Object.freeze([
  'dashboard',
  'settings',
  'biblioteca',
  'ai',
  'chat',
  'proaction',
  'registro_inteligente',
  'cadastrar_com_ia'
]);

const DOMAIN_DELIVERY_MATRIX = Object.freeze({
  hr: {
    domain_axis: 'hr',
    allow: [
      ...UNIVERSAL_SHARED,
      'hr_intelligence',
      'onboarding',
      'people_analytics',
      'rh_governance',
      'training'
    ],
    deny: [
      'safety_intelligence',
      'environment_intelligence',
      'emissions',
      'apr_pt_loto',
      'telemetria_sst',
      'ghe',
      'epi_epc',
      'quality_intelligence',
      'esg',
      'anomaly_detection',
      'manuia'
    ]
  },
  quality: {
    domain_axis: 'quality',
    allow: [
      ...UNIVERSAL_SHARED,
      'quality_intelligence',
      'quality_operational',
      'inspections',
      'ncr_capa',
      'spc',
      'supplier_quality',
      'industrial_telemetry',
      'quality_contextual_intelligence',
      'raw_material_lots',
      'operational'
    ],
    deny: [
      'safety_intelligence',
      'apr_pt_loto',
      'telemetria_sst',
      'incidents',
      'ghe',
      'epi_epc',
      'emissions',
      'environment_intelligence',
      'environmental_governance',
      'executive_esg',
      'esg',
      'hr_intelligence',
      'logistics_intelligence',
      'pilot'
    ]
  },
  safety: {
    domain_axis: 'safety',
    allow: [
      ...UNIVERSAL_SHARED,
      'safety_intelligence',
      'apr_pt_loto',
      'incidents',
      'telemetria_sst',
      'ghe',
      'epi_epc',
      'safety_governance',
      'safety_operational',
      'operational'
    ],
    deny: [
      'hr_intelligence',
      'emissions',
      'environment_intelligence',
      'supplier_quality',
      'quality_intelligence',
      'esg'
    ]
  },
  environmental: {
    domain_axis: 'environmental',
    allow: [
      ...UNIVERSAL_SHARED,
      'environment_intelligence',
      'emissions',
      'ete_eta',
      'residues',
      'environmental_governance',
      'esg_environmental',
      'esg',
      'operational'
    ],
    deny: [
      'apr_pt_loto',
      'safety_intelligence',
      'hr_intelligence',
      'quality_intelligence',
      'telemetria_sst',
      'ghe'
    ]
  },
  production: {
    domain_axis: 'production',
    allow: [...UNIVERSAL_SHARED, 'manuia', 'anomaly_detection', 'operational', 'quality_intelligence'],
    deny: ['hr_intelligence', 'esg', 'audit', 'admin', 'environment_intelligence']
  },
  executive: {
    domain_axis: 'executive',
    allow: [
      ...UNIVERSAL_SHARED,
      'audit',
      'admin',
      'esg',
      'governance',
      'executive_dashboard',
      'strategic_kpis',
      'sustainability',
      'maturity',
      'consolidated_runtime',
      'operational'
    ],
    deny: [
      'safety_intelligence',
      'quality_intelligence',
      'environment_intelligence',
      'cockpit_operacional_bruto',
      'apr_execution',
      'raw_operational_telemetry',
      'anomaly_detection',
      'manuia',
      'hr_intelligence'
    ]
  }
});

function resolveDomainProfile(domainAxis) {
  const axis = String(domainAxis || 'unknown').toLowerCase();
  if (DOMAIN_DELIVERY_MATRIX[axis]) return DOMAIN_DELIVERY_MATRIX[axis];
  if (axis.includes('qual')) return DOMAIN_DELIVERY_MATRIX.quality;
  if (axis.includes('rh') || axis === 'hr') return DOMAIN_DELIVERY_MATRIX.hr;
  if (axis.includes('safety') || axis.includes('sst')) return DOMAIN_DELIVERY_MATRIX.safety;
  if (axis.includes('environment') || axis.includes('ambient')) return DOMAIN_DELIVERY_MATRIX.environmental;
  if (axis.includes('production') || axis.includes('industrial')) return DOMAIN_DELIVERY_MATRIX.production;
  return null;
}

function getCanonicalAllowSet(domainAxis) {
  const profile = resolveDomainProfile(domainAxis);
  if (!profile) return new Set(UNIVERSAL_SHARED);
  return expandDenyList(profile.allow);
}

function getCanonicalDenySet(domainAxis) {
  const profile = resolveDomainProfile(domainAxis);
  if (!profile) return new Set();
  return expandDenyList(profile.deny);
}

module.exports = {
  UNIVERSAL_SHARED,
  DOMAIN_DELIVERY_MATRIX,
  resolveDomainProfile,
  getCanonicalAllowSet,
  getCanonicalDenySet
};
