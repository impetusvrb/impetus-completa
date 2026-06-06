'use strict';

/**
 * AIOI-P2.4 — Strategic Alignment Service (READ ONLY)
 *
 * Score 0-100 baseado em maturity, stability, governance consistency e success rate.
 */

const { isValidUUID } = require('../../utils/security');
const stratMetrics = require('./aioiStrategicMetrics');
const maturityService = require('./aioiMaturityAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');
const snapshotService = require('./aioiExecutiveSnapshotService');

const ALIGNMENT_WEIGHTS = Object.freeze({
  maturity:             0.30,
  stability:            0.25,
  governance_consistency: 0.25,
  success_rate:         0.20
});

function computeAlignmentScore({ maturityScore, stabilityScore, consistencyScore, successRate }) {
  const maturity = maturityScore != null ? maturityScore : 50;
  const stability = stabilityScore != null ? stabilityScore : 50;
  const consistency = consistencyScore != null ? consistencyScore : 50;
  const success = successRate != null ? successRate * 100 : 50;

  const raw =
    maturity * ALIGNMENT_WEIGHTS.maturity +
    stability * ALIGNMENT_WEIGHTS.stability +
    consistency * ALIGNMENT_WEIGHTS.governance_consistency +
    success * ALIGNMENT_WEIGHTS.success_rate;

  return stratMetrics.clampScore(raw);
}

async function getStrategicAlignment(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [maturityRes, stabilityRes, consistencyRes, snapshotRes] = await Promise.all([
      maturityService.getOperationalMaturity(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId),
      snapshotService.getExecutiveSnapshot(companyId)
    ]);

    const failures = [maturityRes, stabilityRes, consistencyRes, snapshotRes].filter(r => !r.ok);
    if (failures.length) {
      stratMetrics.recordError(companyId, 'getStrategicAlignment', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const score = computeAlignmentScore({
      maturityScore:     maturityRes.maturity.score,
      stabilityScore:    stabilityRes.stability.stability_score,
      consistencyScore:  consistencyRes.governance_consistency.score,
      successRate:       snapshotRes.snapshot.operational_success_rate
    });

    const strategic_alignment = {
      score,
      status: stratMetrics.classifyAlignmentStatus(score)
    };

    stratMetrics.recordAlignmentAnalyzed(companyId);
    return { ok: true, strategic_alignment };

  } catch (err) {
    stratMetrics.recordError(companyId, 'getStrategicAlignment', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ALIGNMENT_WEIGHTS,
  computeAlignmentScore,
  getStrategicAlignment
};
