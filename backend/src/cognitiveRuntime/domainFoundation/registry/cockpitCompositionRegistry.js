'use strict';

const { getDomainDefinition, getDomainDensityLimits } = require('./cognitiveDomainRegistry');

const PERSONA_WEIGHTING_MATRIX = Object.freeze({
  operator: { operational: 0.95, governance: 0.05, strategic: 0 },
  supervisor: { operational: 0.85, governance: 0.1, strategic: 0.05 },
  coordination: { operational: 0.7, governance: 0.2, strategic: 0.1 },
  manager: { operational: 0.4, governance: 0.4, strategic: 0.2 },
  director: { operational: 0.1, governance: 0.3, strategic: 0.6 },
  executive: { operational: 0.05, governance: 0.15, strategic: 0.8 }
});

function resolvePersonaTier(profileCode = '') {
  const pc = String(profileCode).toLowerCase();
  if (pc.includes('executive') || pc.includes('ceo') || pc.includes('cfo')) return 'executive';
  if (pc.includes('director')) return 'director';
  if (pc.includes('manager') || pc.includes('gerente')) return 'manager';
  if (pc.includes('coordinator') || pc.includes('coordenador')) return 'coordination';
  if (pc.includes('supervisor')) return 'supervisor';
  return 'operator';
}

function getPersonaWeights(profileCode) {
  const pc = String(profileCode || '').toLowerCase();
  if (pc.includes('safety_technician') || pc.includes('technician_safety')) {
    return { operational: 0.8, governance: 0.15, strategic: 0.05 };
  }
  if (pc.includes('coordinator_safety') || pc.includes('safety_coordinator')) {
    return { operational: 0.65, governance: 0.25, strategic: 0.1 };
  }
  if (pc.includes('coordinator_hr') || pc.includes('hr_analyst') || pc.includes('supervisor_hr')) {
    return { operational: 0.7, governance: 0.2, strategic: 0.1 };
  }
  if (pc.includes('manager_hr') || pc.includes('director_hr')) {
    return { operational: 0.2, governance: 0.4, strategic: 0.4 };
  }
  return PERSONA_WEIGHTING_MATRIX[resolvePersonaTier(profileCode)] || PERSONA_WEIGHTING_MATRIX.operator;
}

function buildCompositionConfig(domain, profileCode) {
  const def = getDomainDefinition(domain);
  const density = getDomainDensityLimits(domain);
  const personaWeights = getPersonaWeights(profileCode);
  const domainWeights = def?.weighting || personaWeights;

  const blended = {
    operational: Math.round(((domainWeights.operational + personaWeights.operational) / 2) * 100) / 100,
    governance: Math.round(((domainWeights.governance + personaWeights.governance) / 2) * 100) / 100,
    strategic: Math.round(((domainWeights.strategic + personaWeights.strategic) / 2) * 100) / 100
  };

  return {
    domain,
    profile_code: profileCode,
    persona_tier: resolvePersonaTier(profileCode),
    blended_weights: blended,
    density,
    cockpit_ready: def?.cockpit_ready === true,
    maturity: def?.maturity || 'unknown'
  };
}

module.exports = {
  PERSONA_WEIGHTING_MATRIX,
  resolvePersonaTier,
  getPersonaWeights,
  buildCompositionConfig
};
