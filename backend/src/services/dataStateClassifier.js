'use strict';

/**
 * Classificador de estado de dados do tenant (data_state + data_completeness).
 * Determina se o tenant tem dados operacionais reais ou está vazio/inactivo.
 * Sem efeitos colaterais — não escreve em BD.
 */

const { estimateOperationalCompleteness, _machineHasRecentActivity } = require('../utils/dataCompleteness');

const EVENT_WINDOW_MINUTES = 60;
const TELEMETRY_WINDOW_HOURS = 24;

function _isMaintenanceEvent(ev) {
  if (!ev) return false;
  const t = (ev.type || ev.event_type || '').toLowerCase();
  return t.includes('maintenance') || t.includes('manutencao') || t.includes('manutenção');
}

function _isQualityEvent(ev) {
  if (!ev) return false;
  const t = (ev.type || ev.event_type || '').toLowerCase();
  return t.includes('quality') || t.includes('qualidade') || t.includes('inspection') || t.includes('inspeção');
}

function _getMissingSignals(machines, events, machinesWithTelemetry) {
  const missing = [];
  if (machinesWithTelemetry === 0) missing.push('plc_telemetry');
  if (events.length === 0) missing.push('production_events');
  if (!events.some(_isMaintenanceEvent)) missing.push('maintenance_events');
  if (!events.some(_isQualityEvent)) missing.push('quality_events');
  return missing;
}

function _getCompletenessReason(machines, machinesWithTelemetry, events) {
  if (machines.length === 0) return 'no_machines_registered';
  if (machinesWithTelemetry === 0) return 'no_telemetry_in_window';
  if (machinesWithTelemetry < machines.length) return 'partial_telemetry';
  return 'fully_covered';
}

function _findLastEventTimestamp(events) {
  if (events.length === 0) return null;
  let latest = null;
  for (const ev of events) {
    const ts = ev.timestamp || ev.created_at || ev.occurred_at;
    if (!ts) continue;
    const d = new Date(ts);
    if (isNaN(d.getTime())) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest ? latest.toISOString() : null;
}

/**
 * Classifica o estado operacional de um tenant com base nos dados disponíveis.
 */
function classify({ machines: rawMachines, events: rawEvents, workOrders: rawWO, kpis: rawKpis } = {}) {
  const machines = Array.isArray(rawMachines) ? rawMachines : [];
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  const workOrders = Array.isArray(rawWO) ? rawWO : [];
  const kpis = Array.isArray(rawKpis) ? rawKpis : [];
  const now = Date.now();

  const machinesWithTelemetry = machines.filter(m => _machineHasRecentActivity(m, events, now)).length;

  const score = estimateOperationalCompleteness({ machines, events, workOrders, kpis });
  const reason = _getCompletenessReason(machines, machinesWithTelemetry, events);
  const missing_signals = _getMissingSignals(machines, events, machinesWithTelemetry);

  const coverage = {
    machines_known: machines.length,
    machines_with_recent_telemetry: machinesWithTelemetry,
    events_window_minutes: EVENT_WINDOW_MINUTES,
    last_event_at: _findLastEventTimestamp(events)
  };

  let data_state;

  if (machines.length === 0) {
    data_state = 'tenant_empty';
  } else if (events.length === 0 && machinesWithTelemetry === 0) {
    data_state = 'tenant_inactive';
  } else if (machinesWithTelemetry > 0 && events.length === 0) {
    data_state = 'production_paused';
  } else {
    data_state = 'production_active';
  }

  return {
    data_state,
    data_completeness: { score, reason, missing_signals },
    coverage
  };
}

module.exports = { classify };
