'use strict';

/**
 * SEC-21 — Validação da cadeia de integração SEC-01 → SEC-20.
 */

function validateIntegrationChain() {
  const chain = [];
  let ok = true;

  const probe = (phase, name, fn) => {
    let result = { phase, name, ok: false, detail: null };
    try {
      result.detail = fn();
      result.ok = result.detail?.ok !== false;
    } catch (e) {
      result.error = e.message;
      result.ok = false;
    }
    if (!result.ok) ok = false;
    chain.push(result);
    return result;
  };

  probe('SEC-01→02', 'observatory_feeds_correlation', () => {
    const sec01 = require('../../securityObservatory');
    const sec02 = require('../../securityCorrelation');
    const obsEnabled = sec01.isEnabled?.();
    const corrEnabled = sec02.isEnabled?.();
    const bus = sec01.bus;
    return {
      ok: obsEnabled && corrEnabled,
      observatoryEnabled: obsEnabled,
      correlationEnabled: corrEnabled,
      hasEventBus: !!bus
    };
  });

  probe('SEC-02→03', 'correlation_feeds_threat_intel', () => {
    const sec02 = require('../../securityCorrelation');
    const sec03 = require('../../securityThreatIntelligence');
    const incidents = sec02.store?.getOpenIncidents?.() || [];
    const dash = sec03.getAuditPayload?.() || sec03.buildDashboard?.({ force: true });
    return {
      ok: sec02.isEnabled?.() && sec03.isEnabled?.(),
      openIncidents: incidents.length,
      hasThreatDashboard: !!dash
    };
  });

  probe('SEC-02→05', 'correlation_feeds_notifications', () => {
    const sec05 = require('../../securityNotification');
    const payload = sec05.getAuditPayload?.();
    return { ok: sec05.isEnabled?.() && !!payload, enabled: sec05.isEnabled?.() };
  });

  probe('SEC-02→06', 'correlation_feeds_response', () => {
    const sec06 = require('../../securityResponse');
    const payload = sec06.getAuditPayload?.();
    const mode = process.env.SECURITY_RESPONSE_DEFAULT_MODE;
    return {
      ok: sec06.isEnabled?.() && mode === 'advise',
      mode,
      protectOff: process.env.SECURITY_RESPONSE_PROTECT_ENABLED !== 'true'
    };
  });

  probe('SEC-04→17', 'integrity_feeds_exfiltration', () => {
    const sec04 = require('../../securityRuntimeIntegrity');
    const sec17 = require('../../securityExfiltrationDetection');
    return {
      ok: sec04.isEnabled?.() && sec17.isEnabled?.(),
      integrity: sec04.isEnabled?.(),
      exfiltration: sec17.isEnabled?.()
    };
  });

  probe('SEC-07', 'soc_aggregates', () => {
    const sec07 = require('../../securitySOC');
    const payload = sec07.getAuditPayload?.();
    return { ok: sec07.isEnabled?.() && !!(payload?.soc || payload?.ok) };
  });

  probe('SEC-10→11', 'active_defense_adaptive', () => {
    const sec10 = require('../../securityActiveDefense');
    const sec11 = require('../../securityAdaptiveProtection');
    return { ok: sec10.isEnabled?.() && sec11.isEnabled?.() };
  });

  probe('SEC-18→19', 'runtime_feeds_operational_cert', () => {
    const sec18 = require('../../securityRuntimeProtection');
    const sec19 = require('../../securityOperationalCertification');
    return { ok: sec18.isEnabled?.() && sec19.isEnabled?.() };
  });

  probe('SEC-19→20', 'operational_feeds_cert_v2', () => {
    const sec20 = require('../../securityCertificationV2');
    const payload = sec20.getAuditPayload?.();
    return {
      ok: !!payload,
      hasSec20Evidence: !!(payload?.evidence?.criteria || payload?.dashboard)
    };
  });

  return { ok, chain, validatedAt: new Date().toISOString() };
}

module.exports = { validateIntegrationChain };
