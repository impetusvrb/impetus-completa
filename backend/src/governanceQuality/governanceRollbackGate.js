'use strict';

const { coordinateRollback } = require('../governanceReadiness/governanceRollbackCoordinator');

/**
 * Valida se rollback pode ser executado com segurança (documentação).
 */
function evaluateRollbackGate(incident = {}) {
  const severity = incident.severity || 'medium';
  const scope =
    severity === 'critical' ?
      'full_governance' :
      severity === 'high' ?
        'phase_f_only' :
        'governance_channels';

  const plan = coordinateRollback({ scope });
  return {
    rollback_recommended: severity !== 'low',
    auto_rollback: false,
    plan,
    preserve_failsafe: true,
    preserve_shadow: true
  };
}

module.exports = { evaluateRollbackGate };
