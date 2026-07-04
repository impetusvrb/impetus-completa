'use strict';

/**
 * SEC-19 — security_operational_certification_v1 DTO.
 */

function createSecurityOperationalCertificationDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'security_operational_certification_v1',
    read_only: true,
    enabled: input.enabled === true,
    mode: input.mode || 'audit',
    attackCoverage: input.attackCoverage || {
      totalScenarios: 0,
      completed: 0,
      detected: 0,
      coverageRatio: 0,
      categories: {}
    },
    detectionAccuracy: input.detectionAccuracy ?? null,
    operationalScore: input.operationalScore ?? null,
    runtimeHealth: input.runtimeHealth || null,
    stressResults: input.stressResults || [],
    readinessLevel: input.readinessLevel || 'UNKNOWN',
    certificationDecision: input.certificationDecision || 'PENDING',
    operationalReadiness: input.operationalReadiness || null,
    attackSimulation: input.attackSimulation || null,
    regressionSummary: input.regressionSummary || null,
    metrics: input.metrics || {},
    disclaimer:
      input.disclaimer ||
      'SEC-19 — certificação operacional por simulação controlada; nenhuma nova protecção activa',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createSecurityOperationalCertificationDto, freezeDto };
