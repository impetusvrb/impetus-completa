'use strict';

/**
 * AIOI-P2.9 — Executive Readiness Service (READ ONLY)
 *
 * Score de prontidão executiva — composição P2.x, cálculo determinístico.
 */

const { isValidUUID } = require('../../utils/security');
const cmdMetrics = require('./aioiExecutiveCommandMetrics');
const maturityService = require('./aioiMaturityAnalysisService');
const alignmentService = require('./aioiStrategicAlignmentService');
const resilienceService = require('./aioiOperationalResilienceService');
const tenantHealthService = require('./aioiTenantHealthService');
const valueService = require('./aioiOperationalValueService');
const twinConsistencyService = require('./aioiTwinConsistencyService');

const READINESS_WEIGHTS = Object.freeze({
  maturity:         0.18,
  alignment:        0.17,
  resilience:       0.18,
  governance:       0.17,
  value:            0.15,
  twin_consistency: 0.15
});

function computeReadinessScore({
  maturityScore,
  alignmentScore,
  resilienceScore,
  governanceScore,
  valueScore,
  twinConsistencyScore
}) {
  const raw =
    (maturityScore ?? 50) * READINESS_WEIGHTS.maturity +
    (alignmentScore ?? 50) * READINESS_WEIGHTS.alignment +
    (resilienceScore ?? 50) * READINESS_WEIGHTS.resilience +
    (governanceScore ?? 50) * READINESS_WEIGHTS.governance +
    (valueScore ?? 50) * READINESS_WEIGHTS.value +
    (twinConsistencyScore ?? 50) * READINESS_WEIGHTS.twin_consistency;
  return cmdMetrics.clampScore(raw);
}

function buildExecutiveReadiness(signals) {
  const readiness_score = computeReadinessScore(signals);
  return {
    readiness_score,
    readiness_level: cmdMetrics.classifyReadinessLevel(readiness_score)
  };
}

async function getExecutiveReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [maturityRes, alignmentRes, resilienceRes, healthRes, valueRes, twinRes] =
      await Promise.all([
        maturityService.getOperationalMaturity(companyId),
        alignmentService.getStrategicAlignment(companyId),
        resilienceService.getOperationalResilience(companyId),
        tenantHealthService.getTenantHealth(companyId),
        valueService.getOperationalValue(companyId),
        twinConsistencyService.getTwinConsistency(companyId)
      ]);

    const failures = [maturityRes, alignmentRes, resilienceRes, healthRes, valueRes, twinRes]
      .filter(r => !r.ok);
    if (failures.length) {
      cmdMetrics.recordError(companyId, 'getExecutiveReadiness', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const executive_readiness = buildExecutiveReadiness({
      maturityScore:        maturityRes.maturity.score,
      alignmentScore:       alignmentRes.strategic_alignment.score,
      resilienceScore:      resilienceRes.operational_resilience.resilience_score,
      governanceScore:      healthRes.tenant_health.score,
      valueScore:           valueRes.operational_value.operational_value_score,
      twinConsistencyScore: twinRes.twin_consistency.consistency_score
    });

    cmdMetrics.recordReadinessAnalyzed(companyId);
    return { ok: true, executive_readiness };

  } catch (err) {
    cmdMetrics.recordError(companyId, 'getExecutiveReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  READINESS_WEIGHTS,
  computeReadinessScore,
  buildExecutiveReadiness,
  getExecutiveReadiness
};
