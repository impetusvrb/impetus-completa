'use strict';

/**
 * AIOI-P4.0 — Institutional Resilience Service (READ ONLY)
 *
 * Resiliência Trust → … → Institutionalization via getInstitutionalizationReadModel (P3.9).
 */

const { isValidUUID } = require('../../utils/security');
const sovMetrics = require('./aioiSovereigntyMetrics');
const institutionalizationReadModel = require('./aioiInstitutionalizationReadModelService');

const RESILIENCE_STAGES = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness',
  'value_governance', 'sustainability', 'certification', 'conformance',
  'governance_excellence', 'institutionalization'
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
    case 'institutionalization':   return signals.institutionalizationScore != null;
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
    case 'institutionalization':   return signals.institutionalizationScore ?? 0;
    default:                       return 0;
  }
}

function computeInstitutionalResilienceScore(irm) {
  const signals = sovMetrics._extractSovereigntySignals(irm);
  let present = 0;
  let scoreSum = 0;

  for (const stage of RESILIENCE_STAGES) {
    if (_stagePresent(signals, stage)) {
      present++;
      scoreSum += _stageScore(signals, stage);
    }
  }

  if (present === 0) return 25;

  const presenceRatio = present / RESILIENCE_STAGES.length;
  const avgScore = scoreSum / present;
  return sovMetrics.clampScore(Math.round(presenceRatio * 40 + avgScore * 0.6));
}

function buildInstitutionalResilience(irm) {
  const resilience_score = computeInstitutionalResilienceScore(irm);
  return {
    resilience_score,
    resilience_status: sovMetrics.classifyInstitutionalResilience(resilience_score)
  };
}

async function getInstitutionalResilience(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const irmRes = await institutionalizationReadModel.getInstitutionalizationReadModel(companyId);
    if (!irmRes.ok) {
      sovMetrics.recordError(companyId, 'getInstitutionalResilience', irmRes.error);
      return { ok: false, error: irmRes.error };
    }

    const institutional_resilience = buildInstitutionalResilience(irmRes.institutionalization_read_model);
    sovMetrics.recordInstitutionalResilienceAnalyzed(companyId);
    return { ok: true, institutional_resilience };

  } catch (err) {
    sovMetrics.recordError(companyId, 'getInstitutionalResilience', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  RESILIENCE_STAGES,
  computeInstitutionalResilienceScore,
  buildInstitutionalResilience,
  getInstitutionalResilience
};
