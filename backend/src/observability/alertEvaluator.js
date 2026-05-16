'use strict';

/**
 * WAVE 2 — avaliador de alertas (observe-only por defeito).
 */

const { isObservabilityV2Enabled, isAlertsObserveOnly } = require('./observabilityFlags');

let _recentAlerts = [];
const MAX_ALERTS = 100;

function _emitAlert(alert) {
  const entry = Object.assign({ ts: new Date().toISOString(), observe_only: isAlertsObserveOnly() }, alert);
  _recentAlerts.push(entry);
  if (_recentAlerts.length > MAX_ALERTS) _recentAlerts.shift();
  try {
    console.warn('[OBS_ALERT]', JSON.stringify(entry));
  } catch (_e) {}
  return entry;
}

function evaluateAlerts(snapshot) {
  if (!isObservabilityV2Enabled()) return [];

  const fired = [];
  const snap = snapshot || {};

  if (snap.slos && Array.isArray(snap.slos.slos)) {
    for (const slo of snap.slos.slos) {
      if (slo.burn_rate != null && slo.burn_rate > 2) {
        fired.push(
          _emitAlert({
            id: 'SLO_BURN_CRITICAL',
            severity: 'critical',
            sli: slo.name,
            burn_rate: slo.burn_rate
          })
        );
      }
    }
  }

  if (snap.saturation && snap.saturation.overall_score > 0.85) {
    fired.push(
      _emitAlert({
        id: 'SATURATION_HIGH',
        severity: 'high',
        score: snap.saturation.overall_score
      })
    );
  }

  if (snap.event_lag && snap.event_lag.p95_ms > 30000) {
    fired.push(
      _emitAlert({
        id: 'OUTBOX_LAG_HIGH',
        severity: 'high',
        p95_ms: snap.event_lag.p95_ms
      })
    );
  }

  if (snap.dlq && snap.dlq.ingress_per_min > 10) {
    fired.push(
      _emitAlert({
        id: 'DLQ_GROWTH',
        severity: 'high',
        ingress_per_min: snap.dlq.ingress_per_min
      })
    );
  }

  if (snap.cognitive_pressure && snap.cognitive_pressure.overall_pressure > 0.8) {
    fired.push(
      _emitAlert({
        id: 'COGNITIVE_PRESSURE_CRITICAL',
        severity: 'critical',
        pressure: snap.cognitive_pressure.overall_pressure
      })
    );
  }

  return fired;
}

function getRecentAlerts(limit = 20) {
  return _recentAlerts.slice(-limit);
}

module.exports = {
  evaluateAlerts,
  getRecentAlerts
};
