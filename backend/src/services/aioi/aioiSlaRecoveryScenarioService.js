'use strict';

/**
 * AIOI-P2.7 — SLA Recovery Scenario Service (READ ONLY)
 *
 * Avalia impacto hipotético de redução dos tempos médios — cálculo determinístico.
 * Sem forecasting novo.
 */

const { isValidUUID } = require('../../utils/security');
const scenMetrics = require('./aioiScenarioMetrics');
const slaService = require('./aioiSlaIntelligenceService');

function simulateSlaRecovery(slaAnalysis, reductionPct) {
  if (!slaAnalysis) {
    return scenMetrics.aggregateSlaStatus(null);
  }

  const simulated = {};
  for (const [stage, data] of Object.entries(slaAnalysis)) {
    const reducedAvg = data.avg_time_ms != null
      ? Math.round(data.avg_time_ms * (1 - reductionPct))
      : null;
    simulated[stage] = slaService.classifySlaStatus(reducedAvg, data.threshold_ms);
  }
  return scenMetrics.aggregateSlaStatus(simulated);
}

function buildSlaRecoveryScenario(slaAnalysis) {
  return {
    current_sla_status: scenMetrics.aggregateSlaStatus(slaAnalysis),
    recovery_10pct:     simulateSlaRecovery(slaAnalysis, scenMetrics.REDUCTION_FACTORS.pct10),
    recovery_25pct:     simulateSlaRecovery(slaAnalysis, scenMetrics.REDUCTION_FACTORS.pct25),
    recovery_50pct:     simulateSlaRecovery(slaAnalysis, scenMetrics.REDUCTION_FACTORS.pct50)
  };
}

async function getSlaRecoveryScenario(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const slaRes = await slaService.getSlaAnalysis(companyId);
    if (!slaRes.ok) {
      scenMetrics.recordError(companyId, 'getSlaRecoveryScenario', slaRes.error);
      return { ok: false, error: slaRes.error };
    }

    const sla_recovery_scenario = buildSlaRecoveryScenario(slaRes.sla_analysis);

    scenMetrics.recordSlaScenarioAnalyzed(companyId);
    return { ok: true, sla_recovery_scenario };

  } catch (err) {
    scenMetrics.recordError(companyId, 'getSlaRecoveryScenario', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  simulateSlaRecovery,
  buildSlaRecoveryScenario,
  getSlaRecoveryScenario
};
