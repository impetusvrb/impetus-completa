'use strict';

/**
 * SEC-02 — Incident Summary (respostas automáticas determinísticas).
 */

const PHASE_LABELS = {
  RECONNAISSANCE: 'Reconhecimento',
  ENUMERATION: 'Enumeração',
  RESOURCE_DISCOVERY: 'Descoberta de recursos',
  AUTH_ATTEMPT: 'Tentativas de autenticação',
  PERSISTENCE: 'Persistência',
  CLOSURE: 'Encerramento'
};

function buildIncidentSummary(incident) {
  const m = incident.metrics || {};
  const ips = incident.participants?.ips || [];
  const uas = incident.participants?.userAgents || [];
  const services = incident.affectedComponents || [];

  return {
    what_happened: describeWhat(incident),
    when_started: incident.firstSeen,
    when_ended: incident.lastSeen,
    duration_human: formatDuration(incident.durationMs),
    duration_ms: incident.durationMs,
    event_count: m.eventCount || incident.evidence?.length || 0,
    request_count: m.requestCount || 0,
    unique_ips: m.uniqueIps || ips.length,
    user_agents: uas.slice(0, 10),
    services_affected: services,
    classification: incident.classification,
    severity: incident.severity,
    components: services,
    risk_score: incident.riskScore,
    confidence: incident.confidence
  };
}

function describeWhat(incident) {
  const cls = incident.classification || 'UNKNOWN';
  const reqs = incident.metrics?.requestCount || 0;
  const ips = (incident.participants?.ips || []).join(', ') || 'desconhecido';

  const templates = {
    CREDENTIAL_SCAN: `Varredura automatizada de credenciais/configs (${reqs} requests) originada de ${ips}.`,
    GENERIC_SCANNER: `Scanner genérico detectado (${reqs} requests) de ${ips}.`,
    ENUMERATION: `Enumeração de endpoints (${reqs} requests) de ${ips}.`,
    BACKGROUND_INTERNET_NOISE: `Ruído de fundo da Internet — actividade automatizada sustentada (${reqs} requests).`,
    CRAWLER: `Crawler/bot indexando assets (${reqs} requests).`,
    HEALTH_CHECK: `Verificações de health check.`,
    UNKNOWN: `Actividade de segurança não classificada (${reqs} requests).`
  };
  return templates[cls] || templates.UNKNOWN;
}

function formatDuration(ms) {
  if (!ms || ms < 1000) return `${ms || 0}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

/**
 * Constrói fases da timeline do incidente a partir de eventos agregados.
 * @param {object[]} phaseEvents sorted by time
 */
function buildIncidentTimelinePhases(phaseEvents) {
  if (!phaseEvents.length) return [];

  const phases = [];
  const first = new Date(phaseEvents[0].time).getTime();
  const last = new Date(phaseEvents[phaseEvents.length - 1].time).getTime();
  const span = last - first;

  const addPhase = (key, time, detail) => {
    phases.push({
      timestamp: time,
      phase: key,
      label: PHASE_LABELS[key] || key,
      detail: detail || ''
    });
  };

  addPhase('RECONNAISSANCE', phaseEvents[0].time, 'Início da actividade detectada');

  const mid1 = phaseEvents[Math.floor(phaseEvents.length * 0.25)]?.time;
  const mid2 = phaseEvents[Math.floor(phaseEvents.length * 0.5)]?.time;
  const mid3 = phaseEvents[Math.floor(phaseEvents.length * 0.75)]?.time;

  if (mid1 && span > 600000) addPhase('ENUMERATION', mid1, 'Enumeração de serviços/endpoints');
  if (mid2 && span > 1200000) addPhase('RESOURCE_DISCOVERY', mid2, 'Descoberta de recursos públicos');

  const hasAuth = phaseEvents.some((e) => e.event_type === 'AUTH_ATTEMPT' || e.path?.includes('/api/auth'));
  if (hasAuth) {
    const authEv = phaseEvents.find((e) => e.event_type === 'AUTH_ATTEMPT' || e.path?.includes('/api/auth'));
    addPhase('AUTH_ATTEMPT', authEv?.time || mid3, 'Tentativas de autenticação');
  }

  if (span > 3600000) addPhase('PERSISTENCE', mid3 || phaseEvents[phaseEvents.length - 1].time, 'Actividade persistente');

  addPhase('CLOSURE', phaseEvents[phaseEvents.length - 1].time, 'Última actividade observada');

  return phases;
}

module.exports = {
  buildIncidentSummary,
  buildIncidentTimelinePhases,
  formatDuration,
  PHASE_LABELS
};
