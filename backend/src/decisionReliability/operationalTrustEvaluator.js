'use strict';

function evaluateOperationalTrust(signals = {}) {
  const base = signals.cognitive_consistency_score ?? signals.contextual_delivery_confidence ?? 0.85;
  const penalty = (signals.ambiguous ? 0.15 : 0) + (signals.weak_guidance ? 0.12 : 0) + (signals.degraded ? 0.1 : 0);
  const operational_trust_score = Number(Math.max(0.2, Math.min(1, base - penalty)).toFixed(4));
  return {
    operational_trust_score,
    contextual_trust: Number((operational_trust_score * 0.95).toFixed(4)),
    runtime_decision_trust: Number((operational_trust_score * 0.92).toFixed(4)),
    low_trust: operational_trust_score < 0.55
  };
}

module.exports = { evaluateOperationalTrust };
