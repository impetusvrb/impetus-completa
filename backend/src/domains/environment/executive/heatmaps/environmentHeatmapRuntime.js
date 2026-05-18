'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const obs = require('../shared/environmentExecutiveObservability');

function _normalizeCells(items) {
  const arr = Array.isArray(items) ? items : [];
  const max = Math.max(...arr.map((x) => Number(x.value) || 0), 1);
  return arr.map((x) => ({
    id: String(x.id || ''),
    label: String(x.label || x.id || ''),
    value: Number(x.value) || 0,
    intensity: (Number(x.value) || 0) / max
  }));
}

function environmentEmissionHeatmapRuntime(input = {}) {
  return _normalizeCells([
    { id: 'co2', label: 'CO₂', value: input.co2 || 0 },
    { id: 'nox', label: 'NOx', value: input.nox || 0 },
    { id: 'voc', label: 'VOC', value: input.voc || 0 }
  ]);
}

function environmentEnergyHeatmapRuntime(input = {}) {
  return _normalizeCells([
    { id: 'demand', label: 'Demanda', value: input.demand_kw || 0 },
    { id: 'losses', label: 'Perdas', value: input.losses_pct || 0 },
    { id: 'efficiency', label: 'Eficiência', value: input.efficiency_pct || 0 }
  ]);
}

function environmentEnvironmentalRiskHeatmap(input = {}) {
  return _normalizeCells([
    { id: 'water', label: 'Água', value: input.water_risk || 0 },
    { id: 'emissions', label: 'Emissões', value: input.emission_risk || 0 },
    { id: 'waste', label: 'Resíduos', value: input.waste_risk || 0 },
    { id: 'compliance', label: 'Compliance', value: input.compliance_risk || 0 }
  ]);
}

function environmentOperationalHeatmapRuntime(input = {}) {
  return _normalizeCells([
    { id: 'eta', label: 'ETA', value: input.eta_load || 0 },
    { id: 'ete', label: 'ETE', value: input.ete_load || 0 },
    { id: 'field', label: 'Campo', value: input.field_incidents || 0 }
  ]);
}

function environmentHeatmapRuntime(input = {}) {
  if (!flags.isEnvironmentExecutiveHeatmapsEnabled()) {
    return { skipped: true, code: 'HEATMAPS_OFF' };
  }
  return obs.withTiming(
    'environment_executive_heatmap_runtime_ms',
    () => ({
      ok: true,
      emissions: environmentEmissionHeatmapRuntime(input.emissions || {}),
      energy: environmentEnergyHeatmapRuntime(input.energy || {}),
      risk: environmentEnvironmentalRiskHeatmap(input.risk || {}),
      operational: environmentOperationalHeatmapRuntime(input.operational || {}),
      esg: _normalizeCells(input.esg_cells || []),
      sustainability: _normalizeCells(input.sustainability_cells || [])
    }),
    { module: 'heatmap' }
  );
}

module.exports = {
  environmentHeatmapRuntime,
  environmentEnvironmentalRiskHeatmap,
  environmentOperationalHeatmapRuntime,
  environmentEnergyHeatmapRuntime,
  environmentEmissionHeatmapRuntime
};
