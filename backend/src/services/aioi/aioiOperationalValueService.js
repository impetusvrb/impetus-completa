'use strict';

/**
 * AIOI-P2.5 — Operational Value Analysis Service (READ ONLY)
 *
 * Score 0-100 composto por sinais P2.3/P2.4 — sem IA, sem valores monetários.
 */

const { isValidUUID } = require('../../utils/security');
const valueMetrics = require('./aioiValueMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const maturityService = require('./aioiMaturityAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');
const alignmentService = require('./aioiStrategicAlignmentService');

const VALUE_WEIGHTS = Object.freeze({
  success_rate:           0.25,
  maturity:               0.20,
  stability:              0.20,
  governance_consistency: 0.15,
  strategic_alignment:    0.20
});

function computeOperationalValueScore({
  successRate,
  maturityScore,
  stabilityScore,
  consistencyScore,
  alignmentScore
}) {
  const success = successRate != null ? successRate * 100 : 50;
  const maturity = maturityScore != null ? maturityScore : 50;
  const stability = stabilityScore != null ? stabilityScore : 50;
  const consistency = consistencyScore != null ? consistencyScore : 50;
  const alignment = alignmentScore != null ? alignmentScore : 50;

  const raw =
    success * VALUE_WEIGHTS.success_rate +
    maturity * VALUE_WEIGHTS.maturity +
    stability * VALUE_WEIGHTS.stability +
    consistency * VALUE_WEIGHTS.governance_consistency +
    alignment * VALUE_WEIGHTS.strategic_alignment;

  return valueMetrics.clampIndex(raw);
}

async function getOperationalValue(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snapshotRes, maturityRes, stabilityRes, consistencyRes, alignmentRes] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      maturityService.getOperationalMaturity(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId),
      alignmentService.getStrategicAlignment(companyId)
    ]);

    const failures = [snapshotRes, maturityRes, stabilityRes, consistencyRes, alignmentRes].filter(r => !r.ok);
    if (failures.length) {
      valueMetrics.recordError(companyId, 'getOperationalValue', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const operational_value_score = computeOperationalValueScore({
      successRate:      snapshotRes.snapshot.operational_success_rate,
      maturityScore:    maturityRes.maturity.score,
      stabilityScore:   stabilityRes.stability.stability_score,
      consistencyScore: consistencyRes.governance_consistency.score,
      alignmentScore:   alignmentRes.strategic_alignment.score
    });

    const operational_value = {
      operational_value_score,
      value_status: valueMetrics.classifyValueStatus(operational_value_score)
    };

    valueMetrics.recordOperationalValueAnalyzed(companyId);
    return { ok: true, operational_value };

  } catch (err) {
    valueMetrics.recordError(companyId, 'getOperationalValue', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VALUE_WEIGHTS,
  computeOperationalValueScore,
  getOperationalValue
};
