'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const db = require('../db');

const LOG_EVENT = {
  CRITICAL_INCIDENT: 'IMPETUS_GOVERNANCE_CRITICAL_INCIDENT',
  HIGH_SEVERITY_BURST: 'IMPETUS_GOVERNANCE_HIGH_SEVERITY_BURST',
  SCAN_ALERT: 'IMPETUS_GOVERNANCE_SCAN_ALERT',
  WEBHOOK_POST_FAILED: 'IMPETUS_GOVERNANCE_WEBHOOK_POST_FAILED'
};

const WEBHOOK_TIMEOUT_MS = 8000;
const WEBHOOK_RETRY_DELAY_MS = 1000;
const WEBHOOK_MAX_ATTEMPTS = 2;

/**
 * Log estruturado para SIEM / agregadores. Webhook CRITICAL: GOVERNANCE_WEBHOOK_URL.
 * @param {string} event
 * @param {Record<string, unknown>} payload
 */
function logGovernanceEvent(event, payload) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      source: 'impetus_ai_governance',
      ...payload
    })
  );
}

/**
 * Única ENV pública para alerta externo; apenas http(s).
 * @returns {string|null}
 */
function getGovernanceWebhookUrl() {
  const raw = process.env.GOVERNANCE_WEBHOOK_URL;
  if (raw == null || String(raw).trim() === '') return null;
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch (err) {
    console.warn('[governanceAlertService][governance_webhook_url]', err?.message ?? err);
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  return u.toString();
}

/**
 * @param {string} webhookUrl
 * @param {Record<string, unknown>} body
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function postJsonOnce(webhookUrl, body, timeoutMs) {
  const u = new URL(webhookUrl);
  const payload = JSON.stringify(body);
  const isHttps = u.protocol === 'https:';
  const lib = isHttps ? https : http;
  const port = u.port ? Number(u.port) : isHttps ? 443 : 80;

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (err) => {
      if (settled) return;
      settled = true;
      try {
        req.removeAllListeners();
      } catch (_) {
        console.warn('[governanceAlertService][req_remove_listeners]', _?.message ?? _);
      }
      if (err) reject(err);
      else resolve();
    };
    const req = lib.request(
      {
        method: 'POST',
        hostname: u.hostname,
        port,
        path: `${u.pathname || '/'}${u.search || ''}`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload, 'utf8')
        }
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          settle();
        } else {
          settle(new Error(`HTTP ${res.statusCode || '?'}`));
        }
      }
    );
    req.on('error', (e) => settle(e));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'));
    });
    req.write(payload, 'utf8');
    req.end();
  });
}

/**
 * Timeout + 1 retentativa (2 tentativas no total), sem bloquear o event loop.
 * @param {string} webhookUrl
 * @param {Record<string, unknown>} body
 * @returns {Promise<void>}
 */
async function postJsonWithRetry(webhookUrl, body) {
  let lastErr;
  for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt += 1) {
    try {
      await postJsonOnce(webhookUrl, body, WEBHOOK_TIMEOUT_MS);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < WEBHOOK_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, WEBHOOK_RETRY_DELAY_MS));
      }
    }
  }
  throw lastErr;
}

/**
 * Enfileira POST em outro turno do event loop: não atraso consultas/fluxo síncrono do handler.
 * @param {{ company_id: string | null, severity: string }} params
 */
function scheduleCriticalWebhookPost(params) {
  const url = getGovernanceWebhookUrl();
  if (!url) return;
  const body = {
    type: 'AI_CRITICAL_INCIDENT',
    company_id: params.company_id != null ? params.company_id : null,
    severity: params.severity,
    timestamp: new Date().toISOString()
  };
  setImmediate(() => {
    postJsonWithRetry(url, body).catch((err) => {
      logGovernanceEvent(LOG_EVENT.WEBHOOK_POST_FAILED, {
        company_id: body.company_id,
        severity: body.severity,
        details: { message: err?.message || String(err) }
      });
    });
  });
}

/**
 * @param {{ id: string, company_id: string, trace_id: string, severity: string, incident_type: string }} incident
 */
async function onIncidentCreated(incident) {
  if (!incident) return;
  const sev = String(incident.severity || '').toUpperCase();
  if (sev === 'CRITICAL') {
    logGovernanceEvent(LOG_EVENT.CRITICAL_INCIDENT, {
      incident_id: incident.id,
      company_id: incident.company_id,
      trace_id: incident.trace_id,
      incident_type: incident.incident_type,
      severity: sev,
      notification_channels_pending: ['email', 'webhook'],
      governance_webhook_configured: Boolean(getGovernanceWebhookUrl())
    });
    scheduleCriticalWebhookPost({
      company_id: incident.company_id,
      severity: sev
    });
  }
  if (sev === 'HIGH' || sev === 'CRITICAL') {
    const r = await db.query(
      `SELECT count(*)::int AS n
       FROM ai_incidents
       WHERE company_id = $1
         AND severity = 'HIGH'
         AND created_at >= now() - interval '24 hours'`,
      [incident.company_id]
    );
    const n = r.rows[0]?.n || 0;
    if (n >= 3) {
      logGovernanceEvent(LOG_EVENT.HIGH_SEVERITY_BURST, {
        company_id: incident.company_id,
        high_incidents_24h: n,
        last_incident_id: incident.id,
        trace_id: incident.trace_id,
        notification_channels_pending: ['email', 'webhook']
      });
    }
  }
}

/**
 * Chamado a partir de métricas/dashboard quando há concentração de risco.
 * @param {{ critical_open: number, high_burst_companies: Array<{ company_id: string, high_count_24h: number }> }} snapshot
 */
function emitGovernanceScanAlert(snapshot) {
  const critical_open = snapshot.critical_open || 0;
  const bursts = snapshot.high_burst_companies || [];
  if (critical_open < 1 && bursts.length < 1) return;
  logGovernanceEvent(LOG_EVENT.SCAN_ALERT, {
    critical_open,
    high_burst_company_count: bursts.length,
    high_burst_companies: bursts.slice(0, 20),
    notification_channels_pending: ['email', 'webhook']
  });
}

module.exports = {
  LOG_EVENT,
  logGovernanceEvent,
  onIncidentCreated,
  emitGovernanceScanAlert
};
