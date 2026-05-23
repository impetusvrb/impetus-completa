'use strict';

function reduceStrategicNoise(centers = []) {
  const low = centers.filter((c) => (c.weight ?? 0) < 0.05);
  return { noise_detected: low.length > 2, filtered: centers.filter((c) => (c.weight ?? 0) >= 0.05) };
}

module.exports = { reduceStrategicNoise };
