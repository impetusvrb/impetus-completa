'use strict';

/**
 * AIOI-P3.6 — Intelligence Maturity Certification Service (READ ONLY)
 *
 * Certificação de maturidade derivada exclusivamente de scores existentes no read model P3.5.
 */

const { isValidUUID } = require('../../utils/security');
const certMetrics = require('./aioiCertificationMetrics');
const sustainabilityReadModel = require('./aioiSustainabilityReadModelService');

const MATURITY_LEVELS = Object.freeze([
  'level_1_foundational',
  'level_2_managed',
  'level_3_governed',
  'level_4_trusted',
  'level_5_certified'
]);

function computeMaturityScore(srm) {
  const values = [
    srm?.intelligence_health?.health_score,
    srm?.governance_continuity?.continuity_score,
    srm?.value_sustainability?.sustainability_score,
    srm?.enterprise_sustainability?.enterprise_sustainability_score,
    srm?.value_governance_read_model?.enterprise_value_governance?.value_governance_score
  ].filter(v => v != null);

  if (!values.length) return 30;
  return certMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildIntelligenceMaturityCertification(srm) {
  const maturity_score = computeMaturityScore(srm);
  return {
    maturity_score,
    maturity_level: certMetrics.classifyMaturityLevel(maturity_score)
  };
}

async function getIntelligenceMaturityCertification(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const susRes = await sustainabilityReadModel.getSustainabilityReadModel(companyId);
    if (!susRes.ok) {
      certMetrics.recordError(companyId, 'getIntelligenceMaturityCertification', susRes.error);
      return { ok: false, error: susRes.error };
    }

    const intelligence_maturity_certification = buildIntelligenceMaturityCertification(
      susRes.sustainability_read_model
    );
    certMetrics.recordMaturityCertificationAnalyzed(companyId);
    return { ok: true, intelligence_maturity_certification };

  } catch (err) {
    certMetrics.recordError(companyId, 'getIntelligenceMaturityCertification', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  MATURITY_LEVELS,
  computeMaturityScore,
  buildIntelligenceMaturityCertification,
  getIntelligenceMaturityCertification
};
