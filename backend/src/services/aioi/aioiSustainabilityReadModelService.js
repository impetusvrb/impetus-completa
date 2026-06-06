'use strict';

/**
 * AIOI-P3.5 — Sustainability Read Model Service (READ ONLY)
 *
 * Agregador P3.4 + capacidades P3.5 — getValueGovernanceReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const susMetrics = require('./aioiSustainabilityMetrics');
const valueGovernanceReadModel = require('./aioiValueGovernanceReadModelService');
const healthService = require('./aioiIntelligenceHealthService');
const continuityService = require('./aioiGovernanceContinuityService');
const valueSustainabilityService = require('./aioiValueSustainabilityService');
const enterpriseSustainabilityService = require('./aioiEnterpriseSustainabilityService');

async function getSustainabilityReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  susMetrics.recordSustainabilityRequested(companyId);
  const startMs = Date.now();

  try {
    const vgRes = await valueGovernanceReadModel.getValueGovernanceReadModel(companyId);
    if (!vgRes.ok) {
      susMetrics.recordError(companyId, 'getSustainabilityReadModel', vgRes.error);
      return { ok: false, error: vgRes.error };
    }

    const vgrm = vgRes.value_governance_read_model;
    const signals = susMetrics._extractGovernanceSignals(vgrm);

    const intelligence_health = healthService.buildIntelligenceHealth(vgrm);
    const governance_continuity = continuityService.buildGovernanceContinuity(vgrm);
    const value_sustainability = valueSustainabilityService.buildValueSustainability(vgrm);

    const enterprise_sustainability = enterpriseSustainabilityService.buildEnterpriseSustainability({
      healthScore:              intelligence_health.health_score,
      continuityScore:          governance_continuity.continuity_score,
      valueSustainabilityScore: value_sustainability.sustainability_score,
      trustScore:               signals.trustScore
    });

    const [
      healthRes,
      continuityRes,
      valueSusRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, intelligence_health }),
      Promise.resolve({ ok: true, governance_continuity }),
      Promise.resolve({ ok: true, value_sustainability }),
      Promise.resolve({ ok: true, enterprise_sustainability })
    ]);

    susMetrics.recordHealthAnalyzed(companyId);
    susMetrics.recordContinuityAnalyzed(companyId);
    susMetrics.recordValueSustainabilityAnalyzed(companyId);
    susMetrics.recordEnterpriseSustainabilityAnalyzed(companyId);
    susMetrics.recordSustainabilityCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      sustainability_read_model: {
        value_governance_read_model: vgrm,
        intelligence_health:         healthRes.intelligence_health,
        governance_continuity:       continuityRes.governance_continuity,
        value_sustainability:        valueSusRes.value_sustainability,
        enterprise_sustainability:   enterpriseRes.enterprise_sustainability
      }
    };

  } catch (err) {
    susMetrics.recordError(companyId, 'getSustainabilityReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getSustainabilityReadModel
};
