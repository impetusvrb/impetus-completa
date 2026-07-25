'use strict';
/**
 * IntegrityEngine — INT-01C (actualizado)
 * Orquestrador: inicializa e interliga todos os componentes.
 * Inclui StateStore, MetricsCollector e instrumentação de tempos.
 */

const IntegrityBaselineManager  = require('./IntegrityBaselineManager');
const IntegrityHashChecker       = require('./IntegrityHashChecker');
const IntegrityPermChecker       = require('./IntegrityPermChecker');
const IntegrityAuditdBridge      = require('./IntegrityAuditdBridge');
const IntegrityEventBus          = require('./IntegrityEventBus');
const IntegrityCorrelationEngine = require('./IntegrityCorrelationEngine');
const IntegrityStateStore        = require('./IntegrityStateStore');
const IntegrityMetricsCollector  = require('./IntegrityMetricsCollector');

// ── Wrapper com instrumentação de tempo ──────────────────────────────────────
class IntegrityHashCheckerInstrumented extends IntegrityHashChecker {
  constructor(bus, bm, metricsCol, options) {
    super(bus, bm, options);
    this._metricsCol = metricsCol;
  }

  async _checkAsset(asset) {
    const t0 = Date.now();
    await super._checkAsset(asset);
    if (this._metricsCol) this._metricsCol.recordHash(Date.now() - t0);
  }

  async _checkAll() {
    const t0 = Date.now();
    await super._checkAll();
    if (this._metricsCol) this._metricsCol.recordScan(Date.now() - t0);
  }
}

// ── IntegrityEngine ──────────────────────────────────────────────────────────
class IntegrityEngine {
  constructor(options = {}) {
    this._options   = options;
    this._running   = false;
    this._startedAt = null;
    this._error     = null;
    this._mode      = 'STOPPED';

    this._bm      = new IntegrityBaselineManager(options);
    this._bus     = new IntegrityEventBus();
    this._store   = options.noStore ? null : IntegrityStateStore.getInstance();
    this._metrics = new IntegrityMetricsCollector();

    this._engine  = new IntegrityCorrelationEngine(
      this._bus, this._bm, this._store, this._metrics
    );
    this._hashChecker  = new IntegrityHashCheckerInstrumented(
      this._bus, this._bm, this._metrics, options
    );
    this._permChecker  = new IntegrityPermChecker(this._bus, this._bm, options);
    this._auditdBridge = new IntegrityAuditdBridge(this._bus, options);

    this._metricsTimer = null;
  }

  start() {
    if (this._running) return this;
    let degraded = false;

    try {
      this._bm.load();
    } catch (e) {
      this._error = `baseline_unavailable: ${e.message}`;
      this._mode  = 'DEGRADED';
      degraded    = true;
    }

    if (this._store) {
      const health = !degraded ? this._bm.getHealth() : null;
      this._store.init({
        sensor_active:     true,
        sensor_started_at: new Date().toISOString(),
        mode:              degraded ? 'DEGRADED' : 'WATCH',
        baseline_id:       health ? health.baseline_id  : null,
        baseline_version:  health ? health.created_at   : null,
        assets_monitored:  health ? health.assets_total : 0,
        last_error:        this._error,
      });
    }

    if (!degraded) {
      this._hashChecker.start();
      this._permChecker.start();
    }

    this._auditdBridge.start();
    this._running   = true;
    this._startedAt = new Date().toISOString();
    this._mode      = degraded ? 'DEGRADED' : 'WATCH';

    this._metricsTimer = setInterval(() => this._flushMetrics(), 30000);
    return this;
  }

  stop() {
    this._hashChecker.stop();
    this._permChecker.stop();
    this._auditdBridge.stop();
    if (this._metricsTimer) { clearInterval(this._metricsTimer); this._metricsTimer = null; }
    this._running = false;
    this._mode    = 'STOPPED';
    if (this._store) this._store.update({ sensor_active: false, mode: 'STOPPED' });
  }

  /** Tenta recuperar de DEGRADED (ex: baseline restaurado). */
  tryRecover() {
    if (this._mode !== 'DEGRADED') return false;
    try {
      this._bm.load();
      this._hashChecker.start();
      this._permChecker.start();
      this._mode  = 'WATCH';
      this._error = null;
      if (this._store) {
        const h = this._bm.getHealth();
        this._store.update({
          mode: 'WATCH', baseline_id: h.baseline_id,
          assets_monitored: h.assets_total, last_error: null, ok: true,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  getState() {
    return {
      running:       this._running,
      started_at:    this._startedAt,
      mode:          this._mode,
      error:         this._error,
      shadow_mode:   true,
      sensor_active: this._running,
      baseline:      (this._running && this._mode !== 'DEGRADED') ? this._bm.getHealth() : null,
      stats: {
        event_bus:    this._bus.getStats(),
        hash_checker: this._hashChecker.getStats(),
        perm_checker: this._permChecker.getStats(),
        correlation:  this._engine.getStats(),
        state_store:  this._store ? this._store.getStoreStats() : null,
      },
      metrics: this._metrics.snapshot(this._bus.size()),
    };
  }

  getMode()            { return this._mode; }
  getEventBus()        { return this._bus; }
  getBaselineManager() { return this._bm; }
  getStateStore()      { return this._store; }
  getMetrics()         { return this._metrics; }
  getCorrelationEngine() { return this._engine; }

  _flushMetrics() {
    if (!this._store || !this._running) return;
    try { this._store.update({ metrics: this._metrics.snapshot(this._bus.size()) }); }
    catch { /* não crítico */ }
  }
}

module.exports = IntegrityEngine;
