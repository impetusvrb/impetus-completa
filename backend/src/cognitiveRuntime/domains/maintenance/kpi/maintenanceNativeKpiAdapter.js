'use strict';

function runMaintenanceNativeKpiAdapter(reliability = {}, health = {}, stability = {}) {
  return {
    kpis: [
      { id: 'mtbf', label: 'MTBF', value: reliability.mtbf_hours, unit: 'h' },
      { id: 'mttr', label: 'MTTR', value: reliability.mttr_hours, unit: 'h' },
      { id: 'downtime', label: 'Downtime', value: reliability.downtime_minutes, unit: 'min' },
      { id: 'availability', label: 'Disponibilidade', value: reliability.availability_pct, unit: '%' },
      { id: 'recurrent_failures', label: 'Falhas Recorrentes', value: reliability.failure_recurrence, unit: '' },
      { id: 'critical_risk', label: 'Risco Crítico', value: health.critical_assets, unit: 'ativos' },
      { id: 'stability', label: 'Estabilidade', value: stability.stability_score, unit: '' },
      { id: 'asset_health', label: 'Saúde Ativos', value: health.asset_health_score, unit: '' }
    ].filter((k) => k.value != null && k.value !== 'none'),
    ebitda_blocked: true,
    esg_executive_blocked: true,
    hr_blocked: true,
    auto_action: false
  };
}

function runReliabilityKpiRuntime(kpi = {}) {
  return { items: kpi.kpis ?? [], auto_action: false };
}

function runMachineHealthKpis(health = {}) {
  return {
    asset_health_score: health.asset_health_score,
    critical_assets: health.critical_assets,
    maintenance_open: health.maintenance_open,
    auto_action: false
  };
}

module.exports = {
  runMaintenanceNativeKpiAdapter,
  runReliabilityKpiRuntime,
  runMachineHealthKpis
};
