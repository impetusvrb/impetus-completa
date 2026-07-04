'use strict';

/**
 * SEC-20 — Consolidador de certificação (evidências reais → decisão).
 */

const collector = require('../collectors/evidenceCollector');
const { createEnterpriseSecurityCertificationV2Dto, freezeDto } = require('../dto/enterpriseSecurityCertificationV2Dto');

function computeReadiness(evidence, regressionSummary) {
  const sec19 = evidence.sec19;
  const phases = evidence.phases;

  const operationalReadiness =
    sec19?.criteria?.criteria?.operational_readiness_available === true
      ? sec19.operational?.readiness?.overallOperationalScore ?? sec19.operationalScore ?? 0.85
      : 0.7;

  const runtimeReadiness =
    sec19?.criteria?.criteria?.stress_tests_completed === true
      ? Math.min(1, (sec19.operational?.dashboard?.runtimeHealth?.stable === false ? 0.7 : 0.92))
      : 0.75;

  const securityReadiness = phases.allCertified ? 0.9 : 0.5;

  const incidentReadiness =
    sec19?.attackSimulationCertified === true
      ? sec19.operational?.dashboard?.detectionAccuracy ?? 0.85
      : 0.6;

  const rollbackReadiness = 0.95;
  const recoveryReadiness = regressionSummary?.passing ? 0.9 : 0.4;

  const consolidated =
    Math.round(
      (operationalReadiness * 0.2 +
        runtimeReadiness * 0.2 +
        securityReadiness * 0.25 +
        incidentReadiness * 0.15 +
        rollbackReadiness * 0.1 +
        recoveryReadiness * 0.1) *
        100
    ) / 100;

  return {
    operationalReadiness: Math.round(operationalReadiness * 100) / 100,
    runtimeReadiness: Math.round(runtimeReadiness * 100) / 100,
    securityReadiness: Math.round(securityReadiness * 100) / 100,
    incidentReadiness: Math.round(incidentReadiness * 100) / 100,
    rollbackReadiness,
    recoveryReadiness: Math.round(recoveryReadiness * 100) / 100,
    consolidatedScore: consolidated
  };
}

function deriveDecision(input) {
  const { phasesCertified, regressionPassing, readiness, ncs } = input;
  const blocking = (ncs || []).filter((n) => n.severity === 'Alta' || n.severity === 'Crítica');

  if (!phasesCertified || !regressionPassing || blocking.length > 0) {
    return 'NOT CERTIFIED';
  }
  if ((ncs || []).length > 0 || readiness.consolidatedScore < 0.9) {
    return 'CERTIFIED WITH REMARKS';
  }
  return 'CERTIFIED';
}

function buildCertificationDashboard(opts = {}) {
  const evidence = collector.collectAllEvidence();
  const regressionSummary = opts.regressionSummary || evidence.sec20.regressionSummary || {
    passing: false,
    suites: 0,
    passed: 0,
    failed: 0,
    source: 'not_executed'
  };

  const readiness = computeReadiness(evidence, regressionSummary);
  const ncs = opts.outstandingNCs || evidence.sec20.certificationLatest?.ncs || [];

  const decision = deriveDecision({
    phasesCertified: evidence.phases.allCertified,
    regressionPassing: regressionSummary.passing === true,
    readiness,
    ncs
  });

  const certificationStatus =
    decision === 'CERTIFIED'
      ? 'ENTERPRISE SECURITY V2 — CERTIFIED'
      : decision === 'CERTIFIED WITH REMARKS'
        ? 'ENTERPRISE SECURITY V2 — CERTIFIED WITH REMARKS'
        : 'ENTERPRISE SECURITY V2 — NOT CERTIFIED';

  return freezeDto(
    createEnterpriseSecurityCertificationV2Dto({
      enabled: opts.enabled === true,
      certificationStatus,
      operationalScore: readiness.operationalReadiness,
      runtimeScore: readiness.runtimeReadiness,
      securityScore: readiness.securityReadiness,
      regressionStatus: {
        passing: regressionSummary.passing === true,
        suites: regressionSummary.suites || 0,
        passed: regressionSummary.passed || 0,
        failed: regressionSummary.failed || 0,
        source: regressionSummary.source || 'evidence'
      },
      attackSimulationStatus: {
        certified: evidence.sec19.attackSimulationCertified === true,
        source: 'evidence/sec-19/criteria.json',
        operational: evidence.sec19.operational?.dashboard?.attackCoverage || null
      },
      stressCertification: {
        certified: evidence.sec19.stressCertified === true,
        source: 'evidence/sec-19/criteria.json',
        results: evidence.sec19.operational?.stressResults || null
      },
      readiness,
      outstandingNCs: ncs,
      certificationDecision: decision,
      phaseEvidence: evidence.phases.phases,
      evidenceSources: [
        'evidence/security-baseline-01/',
        'evidence/sec-01/ … sec-19/',
        'evidence/sec-20/',
        'securityOperationalCertification (read-only)',
        'runtime metrics (process)'
      ],
      metrics: {
        runtime: evidence.runtime,
        moduleSnapshots: evidence.moduleMetrics
      }
    })
  );
}

module.exports = {
  computeReadiness,
  deriveDecision,
  buildCertificationDashboard
};
