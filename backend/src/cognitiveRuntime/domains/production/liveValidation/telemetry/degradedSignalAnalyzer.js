'use strict';

function analyzeDegradedSignals(signalBundle = {}) {
  const op = signalBundle.operational || {};
  let degraded = 0;
  const reasons = [];
  if (signalBundle.ok === false) {
    degraded += 1;
    reasons.push('load_failed');
  }
  if (signalBundle.telemetry_readiness === 'degraded' || signalBundle.telemetry_readiness === 'error') {
    degraded += 1;
    reasons.push(signalBundle.telemetry_readiness);
  }
  if (op.lines_active === 0 && signalBundle.telemetry_readiness !== 'empty') {
    degraded += 1;
    reasons.push('lines_missing');
  }
  if (op.monitored_total === 0) {
    reasons.push('sensors_offline');
  }
  return { degraded_signals: degraded, reasons, masked: false };
}

module.exports = { analyzeDegradedSignals };
