'use strict';

function runMaintenanceNarrativeRuntime(reliability = {}, predictive = {}, governance = {}) {
  const parts = [];
  if (reliability.availability_pct != null) parts.push(`Disponibilidade operacional ${reliability.availability_pct}%`);
  if (predictive.failure_risk && predictive.failure_risk !== 'minimal') parts.push(`Risco falha ${predictive.failure_risk}`);
  if (reliability.failure_recurrence === 'elevated') parts.push('Recorrência de falhas elevada');
  return {
    focus: 'confiabilidade · degradação · disponibilidade · preventiva · risco · estabilidade',
    narrative: parts.length ? parts.join(' · ') : 'Runtime manutenção — aguardando sinais de confiabilidade',
    reliability_native: true,
    corporate_filler: false,
    auto_action: false
  };
}

function runPredictiveNarrativeIntegrity(narrative = {}) {
  return {
    integrity: narrative.reliability_native === true && narrative.corporate_filler !== true,
    auto_action: false
  };
}

function runMaintenanceSummaryGovernance(summary = {}) {
  return {
    supervised_only: true,
    auto_maintenance: false,
    focus_areas: ['confiabilidade', 'degradacao', 'disponibilidade', 'preventiva', 'risco_falha', 'estabilidade'],
    summary: summary.narrative || null,
    auto_action: false
  };
}

module.exports = {
  runMaintenanceNarrativeRuntime,
  runPredictiveNarrativeIntegrity,
  runMaintenanceSummaryGovernance
};
