'use strict';

/**
 * SEC-21 — Sequência de activação operacional SEC-01 → SEC-20.
 * Não cria mecanismos novos — apenas promove flags certificadas.
 */

const ACTIVATION_VERSION = 'SEC-21-v1';
const AUTO_EXECUTE = false;

/** Flags primárias activadas em produção operacional */
const PRIMARY_FLAGS = Object.freeze([
  { phase: 'SEC-01', module: 'securityObservatory', flag: 'SECURITY_OBSERVATORY', auditRoute: '/security-observatory' },
  { phase: 'SEC-02', module: 'securityCorrelation', flag: 'SECURITY_CORRELATION_ENGINE', auditRoute: '/security-incidents', dependsOn: ['SEC-01'] },
  { phase: 'SEC-03', module: 'securityThreatIntelligence', flag: 'SECURITY_THREAT_INTELLIGENCE', auditRoute: '/security-threat-intelligence', dependsOn: ['SEC-02'] },
  { phase: 'SEC-04', module: 'securityRuntimeIntegrity', flag: 'SECURITY_RUNTIME_INTEGRITY', auditRoute: '/security-runtime-integrity' },
  { phase: 'SEC-05', module: 'securityNotification', flag: 'SECURITY_NOTIFICATION_CENTER', auditRoute: '/security-notifications', dependsOn: ['SEC-02'] },
  { phase: 'SEC-06', module: 'securityResponse', flag: 'SECURITY_RESPONSE_ORCHESTRATOR', auditRoute: '/security-response', dependsOn: ['SEC-02'] },
  { phase: 'SEC-07', module: 'securitySOC', flag: 'SECURITY_SOC', auditRoute: '/security-soc', dependsOn: ['SEC-01', 'SEC-02'] },
  { phase: 'SEC-10', module: 'securityActiveDefense', flag: 'SECURITY_ACTIVE_DEFENSE', auditRoute: '/security-active-defense', dependsOn: ['SEC-02'] },
  { phase: 'SEC-11', module: 'securityAdaptiveProtection', flag: 'SECURITY_ADAPTIVE_PROTECTION', auditRoute: '/security-adaptive-protection', dependsOn: ['SEC-10'] },
  { phase: 'SEC-12', module: 'securityExecutionValidation', flag: 'SECURITY_EXECUTION_VALIDATION', auditRoute: '/security-execution-validation', dependsOn: ['SEC-11'] },
  { phase: 'SEC-13', module: 'securityControlledExecution', flag: 'SECURITY_CONTROLLED_EXECUTION', auditRoute: '/security-controlled-execution', dependsOn: ['SEC-12'] },
  { phase: 'SEC-13A', module: 'securityPromotionOperational', flag: 'SECURITY_OPERATIONAL_PROMOTION', auditRoute: '/security-operational-promotion' },
  { phase: 'SEC-14', module: 'securityAdaptiveBlocking', flag: 'SECURITY_ADAPTIVE_BLOCKING', auditRoute: '/security-adaptive-blocking', dependsOn: ['SEC-02'] },
  { phase: 'SEC-15', module: 'securityAntiScanner', flag: 'SECURITY_ANTI_SCANNER', auditRoute: '/security-anti-scanner', dependsOn: ['SEC-02'] },
  { phase: 'SEC-16', module: 'securityThreatDeception', flag: 'SECURITY_THREAT_DECEPTION', auditRoute: '/security-threat-deception', dependsOn: ['SEC-02'] },
  { phase: 'SEC-17', module: 'securityExfiltrationDetection', flag: 'SECURITY_EXFILTRATION_DETECTION', auditRoute: '/security-exfiltration', dependsOn: ['SEC-02', 'SEC-04'] },
  { phase: 'SEC-18', module: 'securityRuntimeProtection', flag: 'SECURITY_RUNTIME_PROTECTION', auditRoute: '/security-runtime-protection', dependsOn: ['SEC-04'] },
  { phase: 'SEC-19', module: 'securityOperationalCertification', flag: 'SECURITY_OPERATIONAL_CERTIFICATION', auditRoute: '/security-operational-certification' },
  { phase: 'SEC-20', module: 'securityCertificationV2', flag: 'SECURITY_CERTIFICATION_V2', auditRoute: '/security-certification-v2' }
]);

/** Endpoints audit adicionais (read-only, sem flag runtime) */
const READ_ONLY_AUDIT_ROUTES = Object.freeze([
  { phase: 'SEC-08', auditRoute: '/security-certification' },
  { phase: 'SEC-09', auditRoute: '/security-promotion' }
]);

/** Modos seguros obrigatórios — nunca auto_execute ofensivo */
const SAFE_MODE_CONSTRAINTS = Object.freeze({
  SECURITY_RESPONSE_DEFAULT_MODE: 'advise',
  SECURITY_RESPONSE_MAX_LEVEL: '1',
  SECURITY_RESPONSE_PROTECT_ENABLED: 'false',
  SECURITY_ACTIVE_DEFENSE_MODE: 'observe',
  SECURITY_ACTIVE_DEFENSE_MAX_LEVEL: '2',
  SECURITY_PROTECTION_MODE: 'observe',
  SECURITY_PROTECTION_REQUIRE_APPROVAL: 'true',
  SECURITY_DRY_RUN_ONLY: 'true',
  SECURITY_AUTO_EXECUTION_LEVEL: 'LOW',
  SECURITY_MANUAL_APPROVAL_REQUIRED: 'true',
  SECURITY_PROMOTION_MODE: 'controlled',
  SECURITY_PROMOTION_VALIDATE: 'true',
  SECURITY_BLOCKING_MODE: 'observe',
  SECURITY_BLOCKING_REQUIRE_APPROVAL: 'true',
  SECURITY_SURFACE_PROTECTION_MODE: 'observe',
  SECURITY_ANTI_SCANNER_REQUIRE_APPROVAL: 'true',
  SECURITY_DECEPTION_MODE: 'observe',
  SECURITY_DECEPTION_REQUIRE_APPROVAL: 'true',
  SECURITY_DATA_PROTECTION_MODE: 'observe',
  SECURITY_EXFILTRATION_REQUIRE_APPROVAL: 'true',
  SECURITY_RUNTIME_PROTECTION_MODE: 'observe',
  SECURITY_RUNTIME_REQUIRE_APPROVAL: 'true',
  SECURITY_OPERATIONAL_CERTIFICATION_MODE: 'audit',
  SECURITY_OPERATIONAL_STRESS_SIMULATED: 'true',
  SEC04_SKIP_GIT_CHECK: 'false'
});

const FORBIDDEN_AUTO_ACTIONS = Object.freeze([
  'Protect mode execution',
  'Lockdown execution',
  'Kill PM2',
  'Restart automático PM2',
  'Firewall automático',
  'nginx automático',
  'SSH automático',
  'IP Block automático',
  'Maintenance Mode automático'
]);

const OPERATIONAL_STATUS = Object.freeze({
  ONLINE: 'ONLINE',
  ACTIVE: 'ACTIVE',
  OPERATIONAL: 'OPERATIONAL',
  MONITORING: 'MONITORING',
  READY: 'READY FOR REAL INCIDENTS'
});

module.exports = {
  ACTIVATION_VERSION,
  AUTO_EXECUTE,
  PRIMARY_FLAGS,
  READ_ONLY_AUDIT_ROUTES,
  SAFE_MODE_CONSTRAINTS,
  FORBIDDEN_AUTO_ACTIONS,
  OPERATIONAL_STATUS
};
