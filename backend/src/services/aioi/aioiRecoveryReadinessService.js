'use strict';

/**
 * AIOI-P2.6 — Recovery Readiness Service (READ ONLY)
 *
 * Prontidão de recuperação baseada em consistência, learning, stability e maturity.
 */

const { isValidUUID } = require('../../utils/security');
const resMetrics = require('./aioiResilienceMetrics');
const maturityService = require('./aioiMaturityAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');

const IOE_TABLE = 'industrial_operational_events';

const READINESS_WEIGHTS = Object.freeze({
  governance_consistency: 0.30,
  learning_completion:    0.25,
  stability:              0.25,
  maturity:               0.20
});

async function _fetchLearningRatio(companyId) {
  return resMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await resMetrics.readQuery(client,
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved,
         COUNT(*) FILTER (
           WHERE status IN ('resolved', 'closed')
             AND (
               decision_payload->>'aioi_learning_processed' = 'true'
               OR decision_payload->>'aioi_learning_submitted' = 'true'
             )
         ) AS learning_done
       FROM ${IOE_TABLE}
       WHERE company_id = $1::uuid`,
      [companyId]
    );
    return result.rows[0] || {};
  });
}

function computeReadinessScore({ consistencyScore, learningRatio, stabilityScore, maturityScore }) {
  const consistency = consistencyScore != null ? consistencyScore : 50;
  const learning = learningRatio != null ? learningRatio * 100 : 50;
  const stability = stabilityScore != null ? stabilityScore : 50;
  const maturity = maturityScore != null ? maturityScore : 50;

  const raw =
    consistency * READINESS_WEIGHTS.governance_consistency +
    learning * READINESS_WEIGHTS.learning_completion +
    stability * READINESS_WEIGHTS.stability +
    maturity * READINESS_WEIGHTS.maturity;

  return resMetrics.clampScore(raw);
}

async function getRecoveryReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [maturityRes, stabilityRes, consistencyRes, learningRow] = await Promise.all([
      maturityService.getOperationalMaturity(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId),
      _fetchLearningRatio(companyId)
    ]);

    if (!maturityRes.ok || !stabilityRes.ok || !consistencyRes.ok) {
      const err = maturityRes.error || stabilityRes.error || consistencyRes.error;
      resMetrics.recordError(companyId, 'getRecoveryReadiness', err);
      return { ok: false, error: err };
    }

    const resolved = parseInt(learningRow.resolved || '0', 10);
    const learningDone = parseInt(learningRow.learning_done || '0', 10);
    const learningRatio = resolved > 0 ? learningDone / resolved : 0.5;

    const readiness_score = computeReadinessScore({
      consistencyScore: consistencyRes.governance_consistency.score,
      learningRatio,
      stabilityScore:   stabilityRes.stability.stability_score,
      maturityScore:    maturityRes.maturity.score
    });

    const recovery_readiness = {
      readiness_score,
      readiness_status: resMetrics.classifyReadinessStatus(readiness_score)
    };

    resMetrics.recordRecoveryReadinessAnalyzed(companyId);
    return { ok: true, recovery_readiness };

  } catch (err) {
    resMetrics.recordError(companyId, 'getRecoveryReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  READINESS_WEIGHTS,
  computeReadinessScore,
  getRecoveryReadiness
};
