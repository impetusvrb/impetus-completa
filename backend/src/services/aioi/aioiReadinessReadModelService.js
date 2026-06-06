'use strict';

/**
 * AIOI-P3.3 — Readiness Read Model Service (READ ONLY)
 *
 * Agregador da camada de readiness + read model P3.2.
 * Composição via Promise.all — auditability obtido uma vez, capacidades derivadas.
 */

const { isValidUUID } = require('../../utils/security');
const readinessMetrics = require('./aioiReadinessMetrics');
const auditabilityReadModel = require('./aioiAuditabilityReadModelService');
const adoptionService = require('./aioiAdoptionAnalysisService');
const operationalReadinessService = require('./aioiOperationalReadinessService');
const governanceReadinessService = require('./aioiGovernanceReadinessService');
const enterpriseScaleReadinessService = require('./aioiEnterpriseScaleReadinessService');

async function getReadinessReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  readinessMetrics.recordReadinessRequested(companyId);
  const startMs = Date.now();

  try {
    const auditRes = await auditabilityReadModel.getAuditabilityReadModel(companyId);
    if (!auditRes.ok) {
      readinessMetrics.recordError(companyId, 'getReadinessReadModel', auditRes.error);
      return { ok: false, error: auditRes.error };
    }

    const arm = auditRes.auditability_read_model;

    const adoption_analysis = adoptionService.buildAdoptionAnalysis(arm);
    const operational_readiness = operationalReadinessService.buildOperationalReadiness(arm);
    const governance_readiness = governanceReadinessService.buildGovernanceReadiness(arm);

    const [
      adoptionRes,
      operationalRes,
      governanceRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, adoption_analysis }),
      Promise.resolve({ ok: true, operational_readiness }),
      Promise.resolve({ ok: true, governance_readiness }),
      Promise.resolve({
        ok: true,
        enterprise_scale_readiness: enterpriseScaleReadinessService.buildEnterpriseScaleReadiness({
          adoptionScore:    adoption_analysis.adoption_score,
          operationalScore: operational_readiness.readiness_score,
          governanceScore:  governance_readiness.governance_readiness_score,
          trustScore:       arm.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score
        })
      })
    ]);

    readinessMetrics.recordAdoptionAnalyzed(companyId);
    readinessMetrics.recordOperationalReadinessAnalyzed(companyId);
    readinessMetrics.recordGovernanceReadinessAnalyzed(companyId);
    readinessMetrics.recordEnterpriseReadinessAnalyzed(companyId);
    readinessMetrics.recordReadinessCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      readiness_read_model: {
        auditability_read_model:    arm,
        adoption_analysis:          adoptionRes.adoption_analysis,
        operational_readiness:      operationalRes.operational_readiness,
        governance_readiness:       governanceRes.governance_readiness,
        enterprise_scale_readiness: enterpriseRes.enterprise_scale_readiness
      }
    };

  } catch (err) {
    readinessMetrics.recordError(companyId, 'getReadinessReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getReadinessReadModel
};
