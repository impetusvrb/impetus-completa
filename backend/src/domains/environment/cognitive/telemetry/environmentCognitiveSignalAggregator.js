'use strict';

/**
 * Agrega sinais operacionais, telemetria e metadados cross-domain para cognição ambiental.
 */

function _nums(arr) {
  return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
}

function aggregateSignals(raw = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    water_flow: _nums(r.water_flow || r.flow_series),
    effluent_ph: _nums(r.effluent_ph || r.ph_series),
    emissions_co2: _nums(r.emissions_co2 || r.co2_series),
    energy_demand: _nums(r.energy_demand || r.demand_series),
    waste_generation: _nums(r.waste_generation || r.waste_series),
    reservoir_level: _nums(r.reservoir_level || r.level_series),
    production_rate: _nums(r.production_rate),
    logistics_carbon_index: Number(r.logistics_carbon_index) || null,
    quality_waste_correlation: Number(r.quality_waste_correlation) || null,
    safety_chemical_exposure: Number(r.safety_chemical_exposure) || null,
    telemetry_anomaly_score: Number(r.telemetry_anomaly_score) || null,
    environmental_area: r.environmental_area != null ? String(r.environmental_area) : 'field',
    plant_id: r.plant_id != null ? String(r.plant_id) : null,
    correlation_id: r.correlation_id != null ? String(r.correlation_id) : null,
    operational_metadata: r.operational_metadata && typeof r.operational_metadata === 'object' ? r.operational_metadata : {}
  };
}

module.exports = { aggregateSignals };
