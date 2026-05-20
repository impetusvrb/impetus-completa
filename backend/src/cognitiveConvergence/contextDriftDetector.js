'use strict';

const phaseM = require('./config/phaseMFeatureFlags');
const { logPhaseM } = require('./phaseMLogger');

function detectContextDrift(previous, current) {
  if (!phaseM.isContextDriftDetectionEnabled() && !phaseM.isCognitiveConvergenceObservabilityEnabled()) {
    return { drift_detected: false, observe_only: true };
  }

  const prevAxis = previous?.contextual_truth?.functional_axis || previous?.functional_axis;
  const curAxis = current?.contextual_truth?.functional_axis || current?.functional_axis;
  const prevConf = previous?.runtime_truth_confidence ?? 0;
  const curConf = current?.runtime_truth_confidence ?? 0;

  const axisDrift = prevAxis && curAxis && prevAxis !== curAxis;
  const confDrift = Math.abs(prevConf - curConf) > 0.2;
  const drift_detected = axisDrift || confDrift;

  if (drift_detected) {
    logPhaseM('CONTEXT_DRIFT_DETECTED', { prevAxis, curAxis, confDrift, shadow_only: !phaseM.isContextDriftDetectionEnabled() });
  }

  return {
    drift_detected,
    axis_drift: axisDrift,
    confidence_drift: confDrift,
    enforcement_active: phaseM.isContextDriftDetectionEnabled(),
    shadow_only: !phaseM.isContextDriftDetectionEnabled()
  };
}

module.exports = { detectContextDrift };
