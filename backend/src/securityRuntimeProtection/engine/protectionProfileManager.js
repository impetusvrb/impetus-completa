'use strict';

/**
 * SEC-18 — Protection Profile Manager.
 * Nunca executa LOCKDOWN — apenas decide perfil recomendado.
 */

const metrics = require('../metrics/runtimeProtectionMetrics');

const PROTECTION_PROFILES = Object.freeze([
  'NORMAL',
  'OBSERVE',
  'ELEVATED',
  'PROTECTED',
  'HARDENED',
  'LOCKDOWN_READY'
]);

const PROFILE_DEFINITIONS = Object.freeze({
  NORMAL: {
    id: 'NORMAL',
    level: 0,
    description: 'Operação standard — sem elevação de protecção',
    lockdownEligible: false
  },
  OBSERVE: {
    id: 'OBSERVE',
    level: 1,
    description: 'Monitorização reforçada — sem alteração operacional',
    lockdownEligible: false
  },
  ELEVATED: {
    id: 'ELEVATED',
    level: 2,
    description: 'Ameaça moderada — auditoria e superfície reduzida (plano)',
    lockdownEligible: false
  },
  PROTECTED: {
    id: 'PROTECTED',
    level: 3,
    description: 'Incidente activo — módulos admin congelados (plano)',
    lockdownEligible: false
  },
  HARDENED: {
    id: 'HARDENED',
    level: 4,
    description: 'Ameaça elevada — dupla aprovação e monitorização máxima (plano)',
    lockdownEligible: false
  },
  LOCKDOWN_READY: {
    id: 'LOCKDOWN_READY',
    level: 5,
    description: 'Pronto para lockdown — NÃO executado nesta fase',
    lockdownEligible: false,
    disclaimer: 'LOCKDOWN_READY é decisão only — execução proibida em SEC-18'
  }
});

function getProfile(profileId) {
  return PROFILE_DEFINITIONS[profileId] || PROFILE_DEFINITIONS.NORMAL;
}

function getAllProfiles() {
  return PROTECTION_PROFILES.map((id) => ({ ...PROFILE_DEFINITIONS[id], certified: true }));
}

function resolveRecommendedProfile(riskAssessment, approvalRequired) {
  const urgency = riskAssessment.protectionUrgency || 0;
  const runtimeRisk = riskAssessment.runtimeRiskScore || 0;
  const exposure = riskAssessment.exposureScore || 0;

  if (runtimeRisk >= 0.85 && urgency >= 0.8) return 'LOCKDOWN_READY';
  if (runtimeRisk >= 0.7 || urgency >= 0.7) return 'HARDENED';
  if (runtimeRisk >= 0.55 || exposure >= 0.6) return 'PROTECTED';
  if (runtimeRisk >= 0.4 || urgency >= 0.45) return 'ELEVATED';
  if (runtimeRisk >= 0.25 || urgency >= 0.25) return 'OBSERVE';
  return 'NORMAL';
}

function recordProfileDecision(current, recommended) {
  metrics.increment('runtime_profiles');
  if (recommended !== current) metrics.increment('recommended_profiles');
  return { current, recommended, profiles: getAllProfiles() };
}

module.exports = {
  PROTECTION_PROFILES,
  PROFILE_DEFINITIONS,
  getProfile,
  getAllProfiles,
  resolveRecommendedProfile,
  recordProfileDecision
};
