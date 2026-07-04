'use strict';

/**
 * SEC-13A — Sequência operacional SEC-01 → SEC-13.
 */

const PROMOTION_VERSION = 'SEC-13A-v1';
const AUTO_ACTIVATION = false;

const OPERATIONAL_SEQUENCE = [
  { order: 1, phase: 'SEC-01', module: 'securityObservatory', primaryFlag: 'SECURITY_OBSERVATORY', dependsOn: [], minObservationMinutes: 15, auditRoute: '/security-observatory' },
  { order: 2, phase: 'SEC-02', module: 'securityCorrelation', primaryFlag: 'SECURITY_CORRELATION_ENGINE', dependsOn: ['SEC-01'], minObservationMinutes: 15, auditRoute: '/security-incidents' },
  { order: 3, phase: 'SEC-03', module: 'securityThreatIntelligence', primaryFlag: 'SECURITY_THREAT_INTELLIGENCE', dependsOn: ['SEC-02'], minObservationMinutes: 15, auditRoute: '/security-threat-intelligence' },
  { order: 4, phase: 'SEC-04', module: 'securityRuntimeIntegrity', primaryFlag: 'SECURITY_RUNTIME_INTEGRITY', dependsOn: [], minObservationMinutes: 20, auditRoute: '/security-runtime-integrity' },
  { order: 5, phase: 'SEC-05', module: 'securityNotification', primaryFlag: 'SECURITY_NOTIFICATION_CENTER', dependsOn: ['SEC-02'], minObservationMinutes: 20, auditRoute: '/security-notifications' },
  {
    order: 6,
    phase: 'SEC-06',
    module: 'securityResponse',
    primaryFlag: 'SECURITY_RESPONSE_ORCHESTRATOR',
    dependsOn: ['SEC-02', 'SEC-03'],
    minObservationMinutes: 30,
    auditRoute: '/security-response',
    requiredConstraints: {
      SECURITY_RESPONSE_DEFAULT_MODE: 'advise',
      SECURITY_RESPONSE_MAX_LEVEL: '1',
      SECURITY_RESPONSE_PROTECT_ENABLED: 'false'
    }
  },
  { order: 7, phase: 'SEC-07', module: 'securitySOC', primaryFlag: 'SECURITY_SOC', dependsOn: ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05', 'SEC-06'], minObservationMinutes: 15, auditRoute: '/security-soc' },
  { order: 8, phase: 'SEC-10', module: 'securityActiveDefense', primaryFlag: 'SECURITY_ACTIVE_DEFENSE', dependsOn: ['SEC-02'], minObservationMinutes: 20, auditRoute: '/security-active-defense' },
  { order: 9, phase: 'SEC-11', module: 'securityAdaptiveProtection', primaryFlag: 'SECURITY_ADAPTIVE_PROTECTION', dependsOn: ['SEC-10'], minObservationMinutes: 20, auditRoute: '/security-adaptive-protection' },
  { order: 10, phase: 'SEC-12', module: 'securityExecutionValidation', primaryFlag: 'SECURITY_EXECUTION_VALIDATION', dependsOn: ['SEC-11'], minObservationMinutes: 20, auditRoute: '/security-execution-validation' },
  { order: 11, phase: 'SEC-13', module: 'securityControlledExecution', primaryFlag: 'SECURITY_CONTROLLED_EXECUTION', dependsOn: ['SEC-12'], minObservationMinutes: 30, auditRoute: '/security-controlled-execution' }
];

const FORBIDDEN_IN_PHASE = [
  'IP blocking',
  'nginx alteration',
  'firewall alteration',
  'SSH alteration',
  'PM2 auto-restart by SEC',
  'lockdown execution',
  'maintenance mode execution',
  'Protect mode',
  'Medium/High auto actions'
];

const ALLOWED_MODES = ['Observe', 'Advise', 'Assist LOW'];

module.exports = {
  PROMOTION_VERSION,
  AUTO_ACTIVATION,
  OPERATIONAL_SEQUENCE,
  FORBIDDEN_IN_PHASE,
  ALLOWED_MODES
};
