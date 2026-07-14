'use strict';

const flags = require('../config/securityReconFlags');
const engine = require('../engine/securityReconCorrelationEngine');
const threatIngest = require('../ingest/threatWatchSignalIngestor');
const store = require('../store/reconStateStore');
const { normalizeFromSec01Event } = require('../engine/signalNormalizer');

let busUnsub = null;
let decisionUnsub = null;

function publishDecisionToObservatory(decision) {
  try {
    const sec01 = require('../../securityObservatory');
    if (!sec01.isEnabled()) return;
    sec01.recordExternalEvent('ANTI_RECON_DECISION', {
      ip: decision.clientIp,
      decision: decision.decision,
      risk_score: decision.riskScore,
      path: decision.requestedPath,
      rule_version: decision.ruleVersion
    });
  } catch (_e) {
    /* optional bridge */
  }
}

function bootstrap() {
  if (!flags.isSecurityReconCorrelationEnabled()) {
    return { enabled: false };
  }

  if (!busUnsub) {
    try {
      const bus = require('../../securityObservatory/bus/securityEventBus');
      busUnsub = bus.subscribe((event) => {
        try {
          const signal = normalizeFromSec01Event(event);
          engine.ingestSignal(signal);
        } catch (e) {
          console.warn('[SEC-RECON] SEC-01 signal:', e?.message || e);
        }
      });
    } catch (e) {
      console.warn('[SEC-RECON] bus subscribe failed:', e?.message || e);
    }
  }

  if (!decisionUnsub) {
    decisionUnsub = engine.subscribeDecision(publishDecisionToObservatory);
  }

  threatIngest.start();
  console.log('[SEC-RECON] Security Recon Correlation Engine activo (aditivo)');
  return { enabled: true };
}

function shutdown() {
  if (busUnsub) {
    busUnsub();
    busUnsub = null;
  }
  if (decisionUnsub) {
    decisionUnsub();
    decisionUnsub = null;
  }
  threatIngest.stop();
  store.stopCleanup();
}

function getAuditPayload() {
  return {
    ok: true,
    phase: 'SEC-RECON',
    correlation_enabled: flags.isSecurityReconCorrelationEnabled(),
    containment_enabled: flags.reconContainmentEnabled(),
    mode: 'additive_correlation',
    rule_version: engine.RULE_VERSION,
    state_snapshot: store.getSnapshot(),
    threat_ingest: {
      log_path: threatIngest.THREAT_LOG,
      incident_dir: threatIngest.INCIDENT_DIR,
      interval_ms: flags.threatWatchIngestIntervalMs()
    },
    criteria: {
      canonical_ip_resolver: true,
      security_signal_model: true,
      signature_catalog: true,
      threat_watch_ingest: true,
      sec01_bus_subscribe: true,
      no_ufw_duplication: true,
      bounded_memory: true
    }
  };
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload
};
