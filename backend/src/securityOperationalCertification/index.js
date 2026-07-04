'use strict';

/**
 * SEC-19 — Enterprise Attack Simulation & Operational Stress Certification.
 * Validação operacional — nenhuma nova funcionalidade de protecção.
 */

const flags = require('./config/securityOperationalCertificationFlags');
const runtime = require('./runtime/operationalCertificationRuntime');
const engine = require('./engine/certificationEngine');

function init() {
  return runtime.bootstrap();
}

module.exports = {
  init,
  shutdown: runtime.shutdown,
  isEnabled: flags.isSecurityOperationalCertificationEnabled,
  flags,
  runtime,
  engine,
  store: require('./store/operationalCertificationStore'),
  metrics: require('./metrics/operationalCertificationMetrics'),
  simulations: {
    attacks: require('./simulations/attackSimulationRunner'),
    stress: require('./simulations/stressTestRunner'),
    catalog: require('./simulations/attackScenarioCatalog')
  },
  readiness: require('./engine/operationalReadinessEngine'),
  getAuditPayload: runtime.getAuditPayload,
  buildDashboard: runtime.buildDashboard,
  runOperationalCertification: engine.runOperationalCertification
};
