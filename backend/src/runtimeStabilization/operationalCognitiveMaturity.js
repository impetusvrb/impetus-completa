'use strict';

function evaluateOperationalCognitiveMaturity(signals = {}) {
  const health = signals.cognitive_runtime_health ?? 0.87;
  const pressure = signals.cognitive_operational_pressure ?? 0.25;
  const operational_cognitive_maturity = Number(Math.max(0, Math.min(1, health - pressure * 0.2)).toFixed(4));
  const sustainability_score = Number(((operational_cognitive_maturity + (1 - pressure)) / 2).toFixed(4));
  return { operational_cognitive_maturity, sustainability_score, runtime_resilience: signals.runtime_resilience ?? 0.88 };
}

module.exports = { evaluateOperationalCognitiveMaturity };
