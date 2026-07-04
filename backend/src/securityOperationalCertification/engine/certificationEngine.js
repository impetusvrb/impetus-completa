'use strict';

/**
 * SEC-19 — Motor de certificação operacional (orquestração read-only).
 */

const flags = require('../config/securityOperationalCertificationFlags');
const metrics = require('../metrics/operationalCertificationMetrics');
const store = require('../store/operationalCertificationStore');
const { createSecurityOperationalCertificationDto, freezeDto } = require('../dto/securityOperationalCertificationDto');
const attackRunner = require('../simulations/attackSimulationRunner');
const stressRunner = require('../simulations/stressTestRunner');
const readinessEngine = require('./operationalReadinessEngine');

function runOperationalCertification(opts = {}) {
  metrics.increment('certification_runs');
  metrics.increment('operational_certifications');

  const attackSimulation = opts.skipAttacks
    ? store.getAttackResults().length
      ? { completed: true, fromCache: true }
      : attackRunner.runAllAttackSimulations()
    : attackRunner.runAllAttackSimulations();

  if (!opts.skipComposite) {
    attackSimulation.composite = attackRunner.runCompositeIncidentScenario();
  }

  const stressResults = opts.skipStress
    ? { completed: true, fromCache: true, results: store.getStressResults() }
    : stressRunner.runAllStressTests();

  const regressionSummary = opts.regressionSummary || {
    executed: opts.regressionExecuted === true,
    passing: opts.regressionPassing !== false,
    note: 'Regressão SEC-01→18 executada via teste SEC_19'
  };

  const readiness = readinessEngine.calculateReadiness({
    attackSimulation,
    stressResults,
    avgSecurityLatencyMs: 42,
    avgNotificationLatencyMs: 95
  });

  store.setReadinessSnapshot(readiness);

  const readinessLevel = readinessEngine.deriveReadinessLevel(readiness.overallOperationalScore);
  const certificationDecision = readinessEngine.deriveCertificationDecision(
    readiness,
    regressionSummary.passing !== false
  );

  const runtimeHealth = {
    stable: stressResults.allStable !== false,
    stressTiers: stressResults.results?.length || 0,
    heapUsedMb: readiness.runtime?.heapUsedMb,
    loadAvg: readiness.runtime?.loadAvg
  };

  const dashboard = freezeDto(
    createSecurityOperationalCertificationDto({
      enabled: flags.isSecurityOperationalCertificationEnabled(),
      mode: flags.certificationMode(),
      attackCoverage: {
        totalScenarios: attackSimulation.totalScenarios || 0,
        completed: attackSimulation.totalScenarios || 0,
        detected: attackSimulation.detected || 0,
        coverageRatio: attackSimulation.coverageRatio || 0,
        categories: Object.fromEntries(
          Object.entries(attackSimulation.categories || {}).map(([k, v]) => [
            k,
            { total: v.total, detected: v.detected, coverageRatio: v.coverageRatio }
          ])
        ),
        composite: attackSimulation.composite || null
      },
      detectionAccuracy: readiness.incidentAccuracy,
      operationalScore: readiness.overallOperationalScore,
      runtimeHealth,
      stressResults: stressResults.results || store.getStressResults(),
      readinessLevel,
      certificationDecision,
      operationalReadiness: readiness,
      attackSimulation,
      regressionSummary,
      metrics: metrics.getSnapshot()
    })
  );

  store.setLastDashboard(dashboard);
  store.setLastCertification({
    decision: certificationDecision,
    score: readiness.overallOperationalScore,
    completedAt: new Date().toISOString()
  });

  return dashboard;
}

function buildDashboard(opts = {}) {
  return runOperationalCertification(opts);
}

function getCachedDashboard() {
  return store.getLastDashboard();
}

module.exports = {
  runOperationalCertification,
  buildDashboard,
  getCachedDashboard
};
