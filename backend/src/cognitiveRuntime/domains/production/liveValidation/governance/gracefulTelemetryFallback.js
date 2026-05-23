'use strict';

function buildGracefulTelemetryFallback(signalBundle = {}) {
  if (signalBundle.telemetry_readiness !== 'empty' && signalBundle.ok !== false) {
    return { active: false };
  }
  return {
    active: true,
    message: 'Telemetria indisponível — aguardar MES/PLC ou registo de turno',
    degraded_safe: signalBundle.telemetry_readiness !== 'error'
  };
}

module.exports = { buildGracefulTelemetryFallback };
