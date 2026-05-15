'use strict';

/**
 * Snapshot ambiental mínimo (mock) para testes internos / shadow.
 * Não expor ao frontend; uso apenas server-side.
 */
function getMockEnvironmentalSnapshot() {
  return {
    metrics: {
      water_intensity: { value: 1.8, target: 1.2, deviation: 0.6 },
      energy_intensity: { value: 320, target: 280, deviation: 40 },
      waste_ratio: { value: 0.12, target: 0.08, deviation: 0.04 }
    },
    window: 'monthly',
    data_quality: 'high',
    as_of: new Date().toISOString()
  };
}

module.exports = {
  getMockEnvironmentalSnapshot
};
