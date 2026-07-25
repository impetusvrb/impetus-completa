'use strict';
/**
 * IntegrityMetricsCollector — INT-01C
 * Coleta métricas operacionais do motor de integridade.
 * Alimenta o campo metrics do state.json.
 */

const os = require('os');

class IntegrityMetricsCollector {
  constructor() {
    this._hashTimes        = [];
    this._scanTimes        = [];
    this._correlationTimes = [];
    this._maxSamples       = 100; // sliding window
    this._cpuPrev          = null;
  }

  /** Registar tempo de um SHA256 individual (ms). */
  recordHash(ms) {
    this._push(this._hashTimes, ms);
  }

  /** Registar tempo de um ciclo completo de scan (ms). */
  recordScan(ms) {
    this._push(this._scanTimes, ms);
  }

  /** Registar tempo de processamento no CorrelationEngine (ms). */
  recordCorrelation(ms) {
    this._push(this._correlationTimes, ms);
  }

  /** Devolve snapshot das métricas actuais. */
  snapshot(queueSize = 0) {
    const mem = process.memoryUsage();
    return {
      avg_hash_ms:        this._avg(this._hashTimes),
      avg_scan_ms:        this._avg(this._scanTimes),
      avg_correlation_ms: this._avg(this._correlationTimes),
      p95_hash_ms:        this._p95(this._hashTimes),
      heap_mb:            parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2)),
      rss_mb:             parseFloat((mem.rss       / 1024 / 1024).toFixed(2)),
      external_mb:        parseFloat((mem.external  / 1024 / 1024).toFixed(2)),
      queue_size:         queueSize,
      samples: {
        hash:        this._hashTimes.length,
        scan:        this._scanTimes.length,
        correlation: this._correlationTimes.length,
      },
    };
  }

  _push(arr, val) {
    arr.push(val);
    if (arr.length > this._maxSamples) arr.shift();
  }

  _avg(arr) {
    if (!arr.length) return 0;
    return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3));
  }

  _p95(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx    = Math.floor(sorted.length * 0.95);
    return parseFloat(sorted[Math.min(idx, sorted.length - 1)].toFixed(3));
  }
}

module.exports = IntegrityMetricsCollector;
