'use strict';

function protectRolloutActivation(safetyPack = {}) {
  const blocked =
    safetyPack.leakage?.leakage_detected ||
    safetyPack.blindness?.critical_blind_spot ||
    safetyPack.entropy?.runtime_entropy_detected ||
    safetyPack.governance_entropy?.runtime_entropy_detected;

  return {
    activation_allowed: !blocked && safetyPack.validator?.safe === true,
    blocked,
    reasons: [
      safetyPack.leakage?.leakage_detected && 'leakage',
      safetyPack.blindness?.critical_blind_spot && 'blindness',
      safetyPack.entropy?.runtime_entropy_detected && 'entropy'
    ].filter(Boolean),
    auto_activate: false,
    chat_blocked: true,
    boundary_blocked: true
  };
}

module.exports = { protectRolloutActivation };
