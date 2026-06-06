'use strict';

/**
 * AIOI-P3.0 — Intelligence Trust Service (READ ONLY)
 *
 * Score composto de confiança — integrity, consistency, reliability, twin_consistency.
 */

const { isValidUUID } = require('../../utils/security');
const trustMetrics = require('./aioiTrustMetrics');
const integrityService = require('./aioiDataIntegrityService');
const consistencyService = require('./aioiModelConsistencyService');
const reliabilityService = require('./aioiForecastReliabilityService');
const twinConsistencyService = require('./aioiTwinConsistencyService');

const TRUST_WEIGHTS = Object.freeze({
  integrity:         0.25,
  consistency:       0.25,
  reliability:       0.25,
  twin_consistency:  0.25
});

function computeTrustScore({ integrityScore, consistencyScore, reliabilityScore, twinConsistencyScore }) {
  const raw =
    (integrityScore ?? 50) * TRUST_WEIGHTS.integrity +
    (consistencyScore ?? 50) * TRUST_WEIGHTS.consistency +
    (reliabilityScore ?? 50) * TRUST_WEIGHTS.reliability +
    (twinConsistencyScore ?? 50) * TRUST_WEIGHTS.twin_consistency;
  return trustMetrics.clampScore(raw);
}

function buildIntelligenceTrust(signals) {
  const trust_score = computeTrustScore(signals);
  return {
    trust_score,
    trust_level: trustMetrics.classifyTrustLevel(trust_score)
  };
}

async function getIntelligenceTrust(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [integrityRes, consistencyRes, reliabilityRes, twinRes] = await Promise.all([
      integrityService.getDataIntegrity(companyId),
      consistencyService.getModelConsistency(companyId),
      reliabilityService.getForecastReliability(companyId),
      twinConsistencyService.getTwinConsistency(companyId)
    ]);

    const failures = [integrityRes, consistencyRes, reliabilityRes, twinRes].filter(r => !r.ok);
    if (failures.length) {
      trustMetrics.recordError(companyId, 'getIntelligenceTrust', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const intelligence_trust = buildIntelligenceTrust({
      integrityScore:       integrityRes.data_integrity.integrity_score,
      consistencyScore:     consistencyRes.model_consistency.consistency_score,
      reliabilityScore:     reliabilityRes.forecast_reliability.reliability_score,
      twinConsistencyScore: twinRes.twin_consistency.consistency_score
    });

    trustMetrics.recordTrustAnalyzed(companyId);
    return { ok: true, intelligence_trust };

  } catch (err) {
    trustMetrics.recordError(companyId, 'getIntelligenceTrust', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  TRUST_WEIGHTS,
  computeTrustScore,
  buildIntelligenceTrust,
  getIntelligenceTrust
};
