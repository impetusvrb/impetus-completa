'use strict';

/**
 * AIOI-P3.9 — Governance Persistence Service (READ ONLY)
 *
 * Continuidade Trust → … → Governance Excellence via getGovernanceExcellenceReadModel (P3.8).
 */

const { isValidUUID } = require('../../utils/security');
const instMetrics = require('./aioiInstitutionalizationMetrics');
const governanceExcellenceReadModel = require('./aioiGovernanceExcellenceReadModelService');

const PERSISTENCE_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence'
]);

function _stagePresent(signals, stage) {
  switch (stage) {
    case 'trust':                return signals.trustScore != null;
    case 'assurance':              return signals.assuranceScore != null;
    case 'auditability':           return signals.auditabilityScore != null;
    case 'readiness':              return signals.readinessScore != null;
    case 'value_governance':       return signals.valueGovernanceScore != null;
    case 'sustainability':         return signals.sustainabilityScore != null;
    case 'certification':          return signals.certificationScore != null;
    case 'conformance':            return signals.conformanceScore != null;
    case 'governance_excellence':  return signals.governanceExcellenceScore != null;
    default:                       return false;
  }
}

function _stageScore(signals, stage) {
  switch (stage) {
    case 'trust':                return signals.trustScore ?? 0;
    case 'assurance':              return signals.assuranceScore ?? 0;
    case 'auditability':           return signals.auditabilityScore ?? 0;
    case 'readiness':              return signals.readinessScore ?? 0;
    case 'value_governance':       return signals.valueGovernanceScore ?? 0;
    case 'sustainability':         return signals.sustainabilityScore ?? 0;
    case 'certification':          return signals.certificationScore ?? 0;
    case 'conformance':            return signals.conformanceScore ?? 0;
    case 'governance_excellence':  return signals.governanceExcellenceScore ?? 0;
    default:                       return 0;
  }
}

function computeGovernancePersistenceScore(germ) {
  const signals = instMetrics._extractInstitutionalizationSignals(germ);
  let present = 0;
  let scoreSum = 0;

  for (const stage of PERSISTENCE_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / PERSISTENCE_STAGES.length;
  const avgScore = scoreSum / present;
  return instMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildGovernancePersistence(germ) {
  const persistence_score = computeGovernancePersistenceScore(germ);
  return {
    persistence_score,
    persistence_status: instMetrics.classifyGovernancePersistence(persistence_score)
  };
}

async function getGovernancePersistence(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const germRes = await governanceExcellenceReadModel.getGovernanceExcellenceReadModel(companyId);
    if (!germRes.ok) {
      instMetrics.recordError(companyId, 'getGovernancePersistence', germRes.error);
      return { ok: false, error: germRes.error };
    }

    const governance_persistence = buildGovernancePersistence(germRes.governance_excellence_read_model);
    instMetrics.recordGovernancePersistenceAnalyzed(companyId);
    return { ok: true, governance_persistence };

  } catch (err) {
    instMetrics.recordError(companyId, 'getGovernancePersistence', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  PERSISTENCE_STAGES,
  computeGovernancePersistenceScore,
  buildGovernancePersistence,
  getGovernancePersistence
};
