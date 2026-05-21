'use strict';
function assessKpiDeliveryConfidence(pack = {}) {
  const converged = pack.convergence?.converged === true;
  const noBlind = pack.blindness?.critical_blind_spot !== true;
  const confidence = converged && noBlind ? 0.9 : noBlind ? 0.65 : 0.4;
  return { delivery_confidence: Number(confidence.toFixed(4)), converged, no_critical_blind_spot: noBlind };
}
module.exports = { assessKpiDeliveryConfidence };
