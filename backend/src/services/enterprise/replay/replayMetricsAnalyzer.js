'use strict';

/**
 * ENTERPRISE READINESS — Fase 3.4
 * Replay Metrics Analyzer
 *
 * Métricas: replay latency, success rate, DLQ escape rate, throughput, backlog growth.
 */

class ReplayMetricsAnalyzer {
  constructor() {
    this._sessions = new Map(); // sessionId → { start, events, succeeded, failed, dlq_escaped }
  }

  startSession(sessionId, totalEvents) {
    this._sessions.set(sessionId, {
      session_id: sessionId,
      total_events: totalEvents,
      start_ms: Date.now(),
      end_ms: null,
      succeeded: 0,
      failed: 0,
      dlq_escaped: 0,
      latencies: []
    });
  }

  recordResult(sessionId, { success, latency_ms, escaped_to_dlq = false }) {
    const s = this._sessions.get(sessionId);
    if (!s) return;
    if (success) s.succeeded++;
    else { s.failed++; if (escaped_to_dlq) s.dlq_escaped++; }
    if (latency_ms != null) s.latencies.push(latency_ms);
  }

  endSession(sessionId) {
    const s = this._sessions.get(sessionId);
    if (!s) return null;
    s.end_ms = Date.now();
    return this.getSessionReport(sessionId);
  }

  getSessionReport(sessionId) {
    const s = this._sessions.get(sessionId);
    if (!s) return null;
    const elapsed = (s.end_ms || Date.now()) - s.start_ms;
    const processed = s.succeeded + s.failed;
    const lats = s.latencies;
    const sortedLats = [...lats].sort((a, b) => a - b);
    const p50 = sortedLats[Math.floor(sortedLats.length * 0.5)] || 0;
    const p99 = sortedLats[Math.floor(sortedLats.length * 0.99)] || 0;
    const avgLat = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
    return {
      session_id: sessionId,
      total_events: s.total_events,
      processed,
      succeeded: s.succeeded,
      failed: s.failed,
      dlq_escaped: s.dlq_escaped,
      success_rate: processed > 0 ? s.succeeded / processed : 0,
      dlq_escape_rate: processed > 0 ? s.dlq_escaped / processed : 0,
      throughput_evs: processed > 0 ? Math.round(processed / elapsed * 1000) : 0,
      backlog: s.total_events - processed,
      latency: { p50: Math.round(p50), p99: Math.round(p99), avg: Math.round(avgLat) },
      elapsed_ms: elapsed
    };
  }

  /**
   * Verifica se os thresholds de SLO são cumpridos.
   * @param {string} sessionId
   * @param {{ min_success_rate?: number, max_dlq_escape_rate?: number, max_p99_ms?: number }} slo
   */
  evaluateSlo(sessionId, slo = {}) {
    const report = this.getSessionReport(sessionId);
    if (!report) return { ok: false, reason: 'session_not_found' };
    const violations = [];
    if (slo.min_success_rate != null && report.success_rate < slo.min_success_rate)
      violations.push(`success_rate ${(report.success_rate * 100).toFixed(1)}% < ${(slo.min_success_rate * 100).toFixed(1)}%`);
    if (slo.max_dlq_escape_rate != null && report.dlq_escape_rate > slo.max_dlq_escape_rate)
      violations.push(`dlq_escape_rate ${(report.dlq_escape_rate * 100).toFixed(1)}% > ${(slo.max_dlq_escape_rate * 100).toFixed(1)}%`);
    if (slo.max_p99_ms != null && report.latency.p99 > slo.max_p99_ms)
      violations.push(`p99 ${report.latency.p99}ms > ${slo.max_p99_ms}ms`);
    return { ok: violations.length === 0, violations, report };
  }
}

module.exports = { ReplayMetricsAnalyzer };
