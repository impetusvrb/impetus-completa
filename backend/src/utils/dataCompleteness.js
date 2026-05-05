'use strict';

const EXPECTED_METRICS_COUNT = 5;
const TELEMETRY_WINDOW_MINUTES = 1440; // 24h

/**
 * Estimativa 0–1 de completude do objeto de métricas (backward compat).
 * Cópia da lógica original de cognitiveAttachmentIngress.
 */
function estimateCompleteness(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return 0;
  const keys = Object.keys(metrics);
  if (keys.length === 0) return 0;
  return Math.min(1, keys.length / EXPECTED_METRICS_COUNT);
}

function _machineHasRecentActivity(machine, events, now) {
  const cutoff = now - TELEMETRY_WINDOW_MINUTES * 60 * 1000;

  const matchingEvent = events.some(ev => {
    if (!ev) return false;
    const mid = ev.machine_id || ev.machine_name;
    return mid && (mid === machine.id || mid === machine._id || mid === machine.name || mid === machine.machine_id);
  });
  if (matchingEvent) return true;

  const lastSeenField = machine.last_seen || machine.updated_at || machine.last_telemetry_at;
  if (lastSeenField) {
    const ts = new Date(lastSeenField).getTime();
    if (!isNaN(ts) && ts >= cutoff) return true;
  }

  return false;
}

/**
 * Estimativa 0–1 da completude de dados operacionais de um tenant.
 * 30% cobertura máquinas com telemetria recente + 30% eventos na janela
 * + 20% OS recentes + 20% KPIs preenchidos.
 */
function estimateOperationalCompleteness({ machines = [], events = [], workOrders = [], kpis = [] } = {}) {
  const now = Date.now();

  let machineScore = 0;
  if (machines.length > 0) {
    const withActivity = machines.filter(m => _machineHasRecentActivity(m, events, now)).length;
    machineScore = Math.min(1, withActivity / Math.max(1, machines.length)) * 0.3;
  }

  const eventScore = Math.min(1, events.length / 5) * 0.3;
  const woScore = Math.min(1, workOrders.length / 3) * 0.2;
  const kpiScore = Math.min(1, kpis.length / 2) * 0.2;

  const raw = machineScore + eventScore + woScore + kpiScore;
  return Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
}

module.exports = {
  estimateCompleteness,
  estimateOperationalCompleteness,
  _machineHasRecentActivity
};
