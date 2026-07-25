'use strict';

/**
 * SEC-21A — Module gate SEC-01 → SEC-21 (read-only audit probe).
 */

const MODULES = Object.freeze([
  { phase: 'SEC-01', module: 'securityObservatory', flag: 'SECURITY_OBSERVATORY', auditRoute: '/security-observatory' },
  { phase: 'SEC-02', module: 'securityCorrelation', flag: 'SECURITY_CORRELATION_ENGINE', auditRoute: '/security-incidents' },
  { phase: 'SEC-03', module: 'securityThreatIntelligence', flag: 'SECURITY_THREAT_INTELLIGENCE', auditRoute: '/security-threat-intelligence' },
  { phase: 'SEC-04', module: 'securityRuntimeIntegrity', flag: 'SECURITY_RUNTIME_INTEGRITY', auditRoute: '/security-runtime-integrity' },
  { phase: 'SEC-05', module: 'securityNotification', flag: 'SECURITY_NOTIFICATION_CENTER', auditRoute: '/security-notifications' },
  { phase: 'SEC-06', module: 'securityResponse', flag: 'SECURITY_RESPONSE_ORCHESTRATOR', auditRoute: '/security-response' },
  { phase: 'SEC-07', module: 'securitySOC', flag: 'SECURITY_SOC', auditRoute: '/security-soc' },
  { phase: 'SEC-10', module: 'securityActiveDefense', flag: 'SECURITY_ACTIVE_DEFENSE', auditRoute: '/security-active-defense' },
  { phase: 'SEC-11', module: 'securityAdaptiveProtection', flag: 'SECURITY_ADAPTIVE_PROTECTION', auditRoute: '/security-adaptive-protection' },
  { phase: 'SEC-12', module: 'securityExecutionValidation', flag: 'SECURITY_EXECUTION_VALIDATION', auditRoute: '/security-execution-validation' },
  { phase: 'SEC-13', module: 'securityControlledExecution', flag: 'SECURITY_CONTROLLED_EXECUTION', auditRoute: '/security-controlled-execution' },
  { phase: 'SEC-13A', module: 'securityPromotionOperational', flag: 'SECURITY_OPERATIONAL_PROMOTION', auditRoute: '/security-operational-promotion' },
  { phase: 'SEC-14', module: 'securityAdaptiveBlocking', flag: 'SECURITY_ADAPTIVE_BLOCKING', auditRoute: '/security-adaptive-blocking' },
  { phase: 'SEC-15', module: 'securityAntiScanner', flag: 'SECURITY_ANTI_SCANNER', auditRoute: '/security-anti-scanner' },
  { phase: 'SEC-16', module: 'securityThreatDeception', flag: 'SECURITY_THREAT_DECEPTION', auditRoute: '/security-threat-deception' },
  { phase: 'SEC-17', module: 'securityExfiltrationDetection', flag: 'SECURITY_EXFILTRATION_DETECTION', auditRoute: '/security-exfiltration' },
  { phase: 'SEC-18', module: 'securityRuntimeProtection', flag: 'SECURITY_RUNTIME_PROTECTION', auditRoute: '/security-runtime-protection' },
  { phase: 'SEC-19', module: 'securityOperationalCertification', flag: 'SECURITY_OPERATIONAL_CERTIFICATION', auditRoute: '/security-operational-certification' },
  { phase: 'SEC-20', module: 'securityCertificationV2', flag: 'SECURITY_CERTIFICATION_V2', auditRoute: '/security-certification-v2' },
  { phase: 'SEC-21', module: 'securityProductionActivation', flag: 'SECURITY_PRODUCTION_ACTIVATION', auditRoute: '/security-production-activation' }
]);

function probeModule(entry) {
  const result = {
    phase: entry.phase,
    module: entry.module,
    flag: entry.flag,
    flagOn: process.env[entry.flag] === 'true',
    status: 'UNKNOWN',
    healthy: false,
    error: null
  };
  try {
    const mod = require(`../../${entry.module}`);
    const payload = mod.getAuditPayload?.() || mod.getPromotionPayload?.();
    if (!payload) {
      result.status = 'MISSING';
      result.error = 'no audit payload';
      return result;
    }
    if (payload.ok === false) {
      result.status = 'FAILED';
      result.error = payload.error || 'ok:false';
      return result;
    }
    result.healthy = true;
    result.status = result.flagOn ? 'ONLINE' : 'READY';
    if (entry.phase === 'SEC-21') {
      const activated = payload.dashboard?.promotionApplied || payload.evidence?.activationLatest;
      if (result.flagOn || activated) result.status = 'ONLINE';
    }
  } catch (e) {
    result.status = 'ERROR';
    result.error = e.message;
  }
  return result;
}

function validateModuleGate() {
  const results = MODULES.map(probeModule);
  const failed = results.filter((r) => r.status === 'FAILED' || r.status === 'ERROR' || r.status === 'MISSING');
  const approved = results.filter((r) => r.healthy);

  return {
    ok: failed.length === 0,
    total: results.length,
    approvedModules: approved.map((r) => r.phase),
    failedModules: failed.map((r) => ({ phase: r.phase, status: r.status, error: r.error })),
    results,
    blocking: failed.length > 0
  };
}

module.exports = { validateModuleGate, MODULES };
