'use strict';

const db = require('../db');

const LOG_EVENT = {
  CRITICAL_INCIDENT: 'IMPETUS_GOVERNANCE_CRITICAL_INCIDENT',
  HIGH_SEVERITY_BURST: 'IMPETUS_GOVERNANCE_HIGH_SEVERITY_BURST',
  SCAN_ALERT: 'IMPETUS_GOVERNANCE_SCAN_ALERT'
};

/**
 * Log estruturado para SIEM / agregadores. Futuro: filas email/webhook.
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
      notification_channels_pending: ['email', 'webhook']
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
