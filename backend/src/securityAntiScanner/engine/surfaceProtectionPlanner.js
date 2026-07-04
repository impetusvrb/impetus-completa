'use strict';

/**
 * SEC-15 — Surface Protection Planner.
 * Gera planos de protecção da superfície — sempre auto_execute: false.
 */

const store = require('../store/antiScannerStore');
const metrics = require('../metrics/antiScannerMetrics');
const flags = require('../config/securityAntiScannerFlags');

const SURFACE_PROFILES = Object.freeze(['NORMAL', 'HARDENED', 'PROTECTED', 'STEALTH']);

const RECOMMENDATION_ACTIONS = Object.freeze([
  'hide_admin_endpoints',
  'hide_internal_pages',
  'uniform_404_response',
  'delay_responses',
  'neutral_content_response',
  'activate_protected_mode',
  'no_action'
]);

function resolveRecommendedSurfaceProfile(confidence, enumerationDetected) {
  if (confidence.scannerConfidence >= 0.75 || confidence.enumerationConfidence >= 0.7) {
    return 'PROTECTED';
  }
  if (confidence.scannerConfidence >= 0.5 || enumerationDetected) return 'HARDENED';
  if (confidence.scannerConfidence >= 0.25) return 'STEALTH';
  return 'NORMAL';
}

function planSurfaceProtection(patterns, enumerationTypes, confidence, surfaceProfile) {
  const recs = [];
  const patternSet = new Set(patterns || []);
  const enumSet = new Set(enumerationTypes || []);

  const add = (action, reason, priority = 'MEDIUM') => {
    recs.push({ action, reason, priority });
  };

  if (patternSet.has('credential_scanner') || enumSet.has('api_enumeration')) {
    add('hide_admin_endpoints', 'Scan de credenciais/API — ocultar endpoints administrativos', 'HIGH');
    add('activate_protected_mode', 'Activar modo protegido recomendado', 'HIGH');
  }
  if (patternSet.has('directory_brute_force') || enumSet.has('sensitive_file_probe')) {
    add('uniform_404_response', 'Enumeração de paths — resposta 404 uniforme recomendada', 'HIGH');
    add('hide_internal_pages', 'Esconder páginas internas da superfície pública', 'MEDIUM');
  }
  if (patternSet.has('endpoint_enumeration') || enumSet.has('sequential_endpoint_growth')) {
    add('neutral_content_response', 'Responder com conteúdo neutro em paths inválidos', 'MEDIUM');
    add('uniform_404_response', 'Evitar vazamento de existência de recursos', 'MEDIUM');
  }
  if (patternSet.has('framework_fingerprinting') || patternSet.has('source_discovery')) {
    add('neutral_content_response', 'Reduzir fingerprint de framework/stack', 'MEDIUM');
    add('hide_internal_pages', 'Minimizar exposição de stack interna', 'MEDIUM');
  }
  if (patternSet.has('aggressive_bot') || patternSet.has('mass_404')) {
    add('delay_responses', 'Atrasar respostas para degradar eficiência do scanner (fase futura)', 'LOW');
  }
  if (patternSet.has('distributed_scanner')) {
    add('activate_protected_mode', 'Scan distribuído — modo protegido + revisão SOC', 'HIGH');
  }
  if (enumSet.has('upload_enumeration') || enumSet.has('asset_enumeration')) {
    add('hide_internal_pages', 'Ocultar paths de uploads/assets', 'MEDIUM');
  }

  if (surfaceProfile === 'PROTECTED' && !recs.some((r) => r.action === 'activate_protected_mode')) {
    add('activate_protected_mode', 'Perfil PROTECTED recomendado pelo confidence engine', 'HIGH');
  }

  if (recs.length === 0) {
    add('no_action', 'Superfície dentro dos limites normais — observação contínua', 'INFO');
  }

  const seen = new Set();
  return recs.filter((r) => {
    if (seen.has(r.action)) return false;
    seen.add(r.action);
    return true;
  });
}

function createSurfaceRecommendation(input) {
  const rec = {
    schema_version: 'surface_protection_plan_v1',
    planId: `surf-${Date.now()}-${String(input.incidentId || 'global').replace(/[^a-z0-9-]/gi, '-')}`,
    incidentId: input.incidentId || null,
    action: input.action,
    protectionReason: input.reason,
    priority: input.priority || 'MEDIUM',
    recommendedSurfaceProfile: input.surfaceProfile || 'NORMAL',
    patterns: input.patterns || [],
    enumerationTypes: input.enumerationTypes || [],
    auto_execute: false,
    executionAllowed: false,
    approvalRequired: flags.requireApproval(),
    mode: flags.surfaceProtectionMode(),
    disclaimer: 'SEC-15 — plano consultivo only, nenhuma alteração HTTP ou infra',
    createdAt: new Date().toISOString()
  };

  store.addSurfacePlan(rec);
  metrics.increment('recommended_surface_changes');
  return rec;
}

function generateSurfaceProtectionPlans(fingerprints, enumerationProfiles, confidence) {
  const enumByIncident = new Map(enumerationProfiles.map((p) => [p.incidentId, p]));
  const surfaceProfile = resolveRecommendedSurfaceProfile(confidence, enumerationProfiles.length > 0);
  metrics.increment('surface_profiles');

  const allPatterns = new Set();
  const allEnumTypes = new Set();
  for (const fp of fingerprints) {
    for (const p of fp.patterns || []) allPatterns.add(p);
  }
  for (const ep of enumerationProfiles) {
    for (const t of ep.enumerationTypes || []) allEnumTypes.add(t);
  }

  const planned = planSurfaceProtection(
    [...allPatterns],
    [...allEnumTypes],
    confidence,
    surfaceProfile
  );

  const plans = planned.map((p) => createSurfaceRecommendation({
    action: p.action,
    reason: p.reason,
    priority: p.priority,
    surfaceProfile,
    patterns: [...allPatterns],
    enumerationTypes: [...allEnumTypes]
  }));

  return { plans, recommendedSurfaceProfile: surfaceProfile };
}

module.exports = {
  SURFACE_PROFILES,
  RECOMMENDATION_ACTIONS,
  resolveRecommendedSurfaceProfile,
  planSurfaceProtection,
  createSurfaceRecommendation,
  generateSurfaceProtectionPlans
};
