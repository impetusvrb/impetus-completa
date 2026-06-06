'use strict';

/**
 * AIOI-P2.6 — Executive Resilience Read Model Service (READ ONLY)
 *
 * Agregador da camada de resiliência + read models P2.1–P2.5.
 */

const { isValidUUID } = require('../../utils/security');
const resMetrics = require('./aioiResilienceMetrics');
const valueReadModel = require('./aioiValueReadModelService');
const resilienceService = require('./aioiOperationalResilienceService');
const dependencyService = require('./aioiDependencyRiskService');
const recoveryService = require('./aioiRecoveryReadinessService');
const sustainabilityService = require('./aioiSustainabilityAnalysisService');

async function getResilienceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  resMetrics.recordResilienceRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      valueRes,
      resilienceRes,
      dependencyRes,
      recoveryRes,
      sustainabilityRes
    ] = await Promise.all([
      valueReadModel.getValueReadModel(companyId),
      resilienceService.getOperationalResilience(companyId),
      dependencyService.getDependencyRisk(companyId),
      recoveryService.getRecoveryReadiness(companyId),
      sustainabilityService.getOperationalSustainability(companyId)
    ]);

    const failures = [valueRes, resilienceRes, dependencyRes, recoveryRes, sustainabilityRes].filter(r => !r.ok);
    if (failures.length) {
      resMetrics.recordError(companyId, 'getResilienceReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const vrm = valueRes.value_read_model;
    resMetrics.recordResilienceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      resilience_read_model: {
        governance_read_model:   vrm.governance_read_model,
        predictive_read_model:   vrm.predictive_read_model,
        maturity_read_model:     vrm.maturity_read_model,
        strategic_read_model:    vrm.strategic_read_model,
        value_read_model: {
          operational_value:    vrm.operational_value,
          risk_impact:          vrm.risk_impact,
          bottleneck_cost:      vrm.bottleneck_cost,
          portfolio_analysis:   vrm.portfolio_analysis
        },
        operational_resilience:  resilienceRes.operational_resilience,
        dependency_risk:         dependencyRes.dependency_risk,
        recovery_readiness:      recoveryRes.recovery_readiness,
        sustainability:          sustainabilityRes.sustainability
      }
    };

  } catch (err) {
    resMetrics.recordError(companyId, 'getResilienceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getResilienceReadModel
};
