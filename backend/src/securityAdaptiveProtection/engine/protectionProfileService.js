'use strict';

/**
 * SEC-11 — Protection Profile Engine.
 * Define perfis — nunca modifica runtime.
 */

const PROFILES = Object.freeze({
  NORMAL: {
    id: 'NORMAL',
    label: 'Operação standard',
    sensitiveEndpoints: { exposed: true, adminApis: 'full', publicDocs: true },
    adminResources: { restricted: false, dualApproval: false },
    publicApis: { rateLimit: 'standard', enumerationHardening: false },
    uploads: { enabled: true, isolated: false },
    authentication: { strict: false, captcha: false },
    observability: { enhanced: false }
  },
  ELEVATED: {
    id: 'ELEVATED',
    label: 'Observação aumentada',
    sensitiveEndpoints: { exposed: true, adminApis: 'monitored', publicDocs: true },
    adminResources: { restricted: false, dualApproval: false },
    publicApis: { rateLimit: 'elevated', enumerationHardening: false },
    uploads: { enabled: true, isolated: false },
    authentication: { strict: false, captcha: false },
    observability: { enhanced: true }
  },
  DEFENSE: {
    id: 'DEFENSE',
    label: 'Defesa activa consultiva',
    sensitiveEndpoints: { exposed: 'partial', adminApis: 'restricted', publicDocs: false },
    adminResources: { restricted: true, dualApproval: true },
    publicApis: { rateLimit: 'strict', enumerationHardening: true },
    uploads: { enabled: true, isolated: true },
    authentication: { strict: true, captcha: true },
    observability: { enhanced: true }
  },
  PROTECTED: {
    id: 'PROTECTED',
    label: 'Protecção máxima planificada',
    sensitiveEndpoints: { exposed: false, adminApis: 'minimal', publicDocs: false },
    adminResources: { restricted: true, dualApproval: true },
    publicApis: { rateLimit: 'strict', enumerationHardening: true },
    uploads: { enabled: false, isolated: true },
    authentication: { strict: true, captcha: true },
    observability: { enhanced: true }
  },
  LOCKDOWN: {
    id: 'LOCKDOWN',
    label: 'Lockdown lógico (plano only)',
    sensitiveEndpoints: { exposed: false, adminApis: 'emergency_only', publicDocs: false },
    adminResources: { restricted: true, dualApproval: true },
    publicApis: { rateLimit: 'minimal', enumerationHardening: true },
    uploads: { enabled: false, isolated: true },
    authentication: { strict: true, captcha: true },
    observability: { enhanced: true }
  }
});

function getProfile(profileId) {
  return PROFILES[profileId] || PROFILES.NORMAL;
}

function recommendProfile(threatLevel, securityMode, runtimeScore) {
  if (threatLevel === 'CRITICAL' || securityMode === 'PROTECTED') return 'LOCKDOWN';
  if (threatLevel === 'HIGH' || securityMode === 'DEFENSE') return 'PROTECTED';
  if (threatLevel === 'MEDIUM' || securityMode === 'ELEVATED') return 'DEFENSE';
  if (threatLevel === 'LOW' || securityMode === 'MONITORING') return 'ELEVATED';
  if (runtimeScore < 0.5) return 'DEFENSE';
  return 'NORMAL';
}

module.exports = { PROFILES, getProfile, recommendProfile };
