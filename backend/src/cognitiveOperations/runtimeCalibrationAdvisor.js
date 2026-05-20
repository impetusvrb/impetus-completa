'use strict';

const { recommendCalibration } = require('./governanceCalibrationEngine');

function adviseRuntimeCalibration(operationsReport = {}) {
  return {
    advisor: 'runtime_calibration_advisor_v1',
    ...recommendCalibration(operationsReport),
    tuning_hints: [
      'Manter observabilidade ON em produção',
      'Activar enforcement apenas por tenant piloto',
      'Revisar enrichers legacy antes de UNIFIED_CONTEXT'
    ]
  };
}

module.exports = { adviseRuntimeCalibration };
