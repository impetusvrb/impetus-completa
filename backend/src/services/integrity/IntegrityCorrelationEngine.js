'use strict';
/**
 * IntegrityCorrelationEngine — INT-01C (actualizado)
 * Enriquece eventos, classifica severidade, suprime falsos positivos.
 * Persiste em: shadow log + IntegrityStateStore (state.json + events.jsonl).
 * SHADOW MODE: não alimenta Dashboard, não alimenta threat-watch.log.
 */

const fs   = require('fs');
const path = require('path');

const SHADOW_LOG_PATH = process.env.INTEGRITY_SHADOW_LOG ||
  '/var/log/impetus-integrity-shadow.log';

const SUPPRESS_DEPLOY_MS = parseInt(
  process.env.INTEGRITY_DEPLOY_SUPPRESS_MINUTES || '10', 10
) * 60 * 1000;

const CERTBOT_PATH_MARKERS = ['/letsencrypt/', '/certbot/'];
const LOW_NOISE_KEYS       = new Set(['impetus_exec_git', 'impetus_root_exec']);

class IntegrityCorrelationEngine {
  /**
   * @param {IntegrityEventBus}          eventBus
   * @param {IntegrityBaselineManager}   baselineManager
   * @param {IntegrityStateStore|null}   stateStore  — opcional (null em testes sem store)
   * @param {IntegrityMetricsCollector|null} metrics — opcional
   */
  constructor(eventBus, baselineManager, stateStore = null, metrics = null) {
    this._bus        = eventBus;
    this._bm         = baselineManager;
    this._store      = stateStore;
    this._metrics    = metrics;
    this._stats      = { processed: 0, suppressed: 0, written: 0, persisted: 0, errors: 0 };
    this._violations = 0;
    this._deployModeAt = null;

    this._bus.on('integrity_event', (event) => this._process(event));
    this._initShadowLog();
  }

  getStats()      { return { ...this._stats, violations: this._violations }; }
  getViolations() { return this._violations; }

  _process(event) {
    this._stats.processed++;
    const t0 = Date.now();

    try {
      const enriched      = this._enrich(event);
      const suppressReason = this._shouldSuppress(enriched);

      if (suppressReason) {
        this._stats.suppressed++;
        enriched.suppressed      = true;
        enriched.suppress_reason = suppressReason;
      } else if (enriched.severity_final === 'CRITICAL' || enriched.severity_final === 'HIGH') {
        this._violations++;
        // Actualizar state store
        if (this._store) {
          this._store.update({
            ok:         false,
            violations: this._violations,
            stats: { events_produced: this._stats.processed },
          });
        }
      }

      // 1. Shadow log (sempre, incluindo suprimidos)
      this._writeShadow(enriched);

      // 2. Persistência em events.jsonl (apenas não-suprimidos e severidade ≥ MEDIUM)
      if (!enriched.suppressed &&
          ['CRITICAL', 'HIGH', 'MEDIUM'].includes(enriched.severity_final)) {
        if (this._store) {
          this._store.appendEvent(enriched);
          this._stats.persisted++;
        }
      }

      // 3. Actualizar stats no state store
      if (this._store) {
        this._store.update({
          stats: {
            events_produced:   this._stats.processed,
            events_suppressed: this._stats.suppressed,
            events_persisted:  this._stats.persisted,
          },
        });
      }

      // 4. Métricas
      if (this._metrics) {
        this._metrics.recordCorrelation(Date.now() - t0);
      }

    } catch (e) {
      this._stats.errors++;
    }
  }

  _enrich(event) {
    const enriched = { ...event };

    if (!enriched.asset_criticality || !enriched.asset_id) {
      const assetInfo = this._bm.getAssetByPath(enriched.asset_path || '');
      if (assetInfo) {
        enriched.asset_id          = enriched.asset_id          || assetInfo.id;
        enriched.asset_criticality = enriched.asset_criticality || assetInfo.criticality;
      }
    }

    enriched.severity_final          = this._computeSeverity(enriched);
    enriched.false_positive_score    = this._fpScore(enriched);
    enriched.response_required       = enriched.false_positive_score < 50;
    enriched.escalate_to_observatory = (
      enriched.severity_final === 'CRITICAL' ||
      enriched.severity_final === 'HIGH'
    );

    return enriched;
  }

  _computeSeverity(event) {
    if (event.auditd_key && LOW_NOISE_KEYS.has(event.auditd_key)) return 'LOW';
    if (event.asset_criticality === 'CRITICAL') {
      if (['INTEGRITY_HASH_CHANGED', 'INTEGRITY_FILE_DELETED',
           'INTEGRITY_OWNER_CHANGED', 'INTEGRITY_ENV_CHANGED',
           'INTEGRITY_CERT_CHANGED'].includes(event.event_type)) {
        return 'CRITICAL';
      }
      return 'HIGH';
    }
    return event.severity || 'MEDIUM';
  }

  _shouldSuppress(event) {
    if (process.env.IMPETUS_DEPLOY_MODE === 'active') {
      if (['INTEGRITY_HASH_CHANGED', 'INTEGRITY_PERM_CHANGED'].includes(event.event_type)) {
        return 'deploy_mode_active';
      }
    }
    if (this._deployModeAt && Date.now() - this._deployModeAt < SUPPRESS_DEPLOY_MS) {
      return 'deploy_suppress_window';
    }
    const p = event.asset_path || '';
    if (CERTBOT_PATH_MARKERS.some(m => p.includes(m)) &&
        event.event_type === 'INTEGRITY_CERT_CHANGED') {
      return 'certbot_renewal_expected';
    }
    return null;
  }

  _fpScore(event) {
    let score = 0;
    if (event.suppress_reason)                                  score += 80;
    if (event.auditd_key && LOW_NOISE_KEYS.has(event.auditd_key)) score += 30;
    if (event.event_type === 'INTEGRITY_ANOMALY')               score += 20;
    return Math.min(100, score);
  }

  _initShadowLog() {
    try {
      const dir = path.dirname(SHADOW_LOG_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const header = `\n[${new Date().toISOString()}] INTEGRITY_SHADOW_SESSION_START pid=${process.pid} SHADOW_MODE=true\n`;
      fs.appendFileSync(SHADOW_LOG_PATH, header, 'utf8');
    } catch { /* shadow log não é crítico */ }
  }

  _writeShadow(event) {
    try {
      fs.appendFileSync(SHADOW_LOG_PATH, JSON.stringify(event) + '\n', 'utf8');
      this._stats.written++;
    } catch { this._stats.errors++; }
  }
}

module.exports = IntegrityCorrelationEngine;
