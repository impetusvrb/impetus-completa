'use strict';

/**
 * SEC-01 — Ingestão agregada de logs nginx (batch, não request-a-request).
 * Uso: import histórico ou cron — nunca bloqueia runtime.
 */

const metrics = require('../metrics/securityMetricsStore');
const runtime = require('../observatory/securityObservatoryRuntime');
const flags = require('../config/securityObservatoryFlags');

/** Parse linha nginx combined simplificado */
function parseNginxAccessLine(line) {
  const m = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*)" (\d+) (\d+)/);
  if (!m) return null;
  return {
    ip: m[1],
    method: m[3],
    path: (m[4] || '/').split('?')[0],
    status: parseInt(m[5], 10),
    bytes: parseInt(m[6], 10) || 0
  };
}

/**
 * Ingere linhas nginx em batch — consolida via metrics store existente.
 * @param {string[]} lines
 * @param {object} opts
 * @returns {{ ingested: number, skipped: number }}
 */
function ingestNginxLines(lines, opts = {}) {
  if (!flags.isSecurityObservatoryEnabled() && !opts.force) {
    return { ingested: 0, skipped: lines.length, reason: 'observatory_disabled' };
  }

  let ingested = 0;
  let skipped = 0;
  const ua = opts.userAgentDefault || 'nginx-log-import';

  for (const line of lines) {
    const parsed = parseNginxAccessLine(String(line).trim());
    if (!parsed) {
      skipped += 1;
      continue;
    }
    metrics.recordHttpSample({
      ip: parsed.ip,
      path: parsed.path,
      method: parsed.method,
      status: parsed.status,
      bytes: parsed.bytes,
      latencyMs: 0,
      userAgent: ua,
      timestamp: opts.timestamp || Date.now()
    });
    ingested += 1;
  }

  if (ingested > 0) {
    runtime.flushAggregationWindows();
  }

  return { ingested, skipped };
}

module.exports = {
  parseNginxAccessLine,
  ingestNginxLines
};
