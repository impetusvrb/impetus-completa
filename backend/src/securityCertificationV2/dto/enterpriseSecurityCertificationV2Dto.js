'use strict';

/**
 * SEC-20 — enterprise_security_certification_v2 DTO.
 */

function createEnterpriseSecurityCertificationV2Dto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'enterprise_security_certification_v2',
    read_only: true,
    enabled: input.enabled === true,
    certificationStatus: input.certificationStatus || 'PENDING',
    operationalScore: input.operationalScore ?? null,
    runtimeScore: input.runtimeScore ?? null,
    securityScore: input.securityScore ?? null,
    regressionStatus: input.regressionStatus || { passing: false, suites: 0, passed: 0, failed: 0 },
    attackSimulationStatus: input.attackSimulationStatus || null,
    stressCertification: input.stressCertification || null,
    readiness: input.readiness || null,
    outstandingNCs: input.outstandingNCs || [],
    certificationDecision: input.certificationDecision || 'NOT CERTIFIED',
    phaseEvidence: input.phaseEvidence || [],
    evidenceSources: input.evidenceSources || [],
    metrics: input.metrics || {},
    disclaimer:
      input.disclaimer ||
      'SEC-20 — certificação de encerramento Enterprise Security v2; arquitectura congelada',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createEnterpriseSecurityCertificationV2Dto, freezeDto };
