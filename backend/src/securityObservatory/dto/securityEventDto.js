'use strict';

/**
 * SEC-01 — Security Event DTO (normalizado).
 * Eventos agregados por janela — não um DTO por request bruto.
 */

const EVENT_TYPES = Object.freeze([
  'HTTP_SCAN',
  'ENUMERATION',
  'AUTH_ATTEMPT',
  'RATE_ANOMALY',
  'USER_AGENT_ANOMALY',
  'HEADER_ANOMALY',
  'PATH_DISCOVERY',
  'ASSET_DISCOVERY',
  'BOT_ACTIVITY',
  'SSH_EVENT',
  'PM2_EVENT',
  'FILE_INTEGRITY',
  'CONFIG_CHANGE',
  'PROCESS_CHANGE',
  'NETWORK_CHANGE',
  'TLS_EVENT'
]);

const CLASSIFICATIONS = Object.freeze([
  'BACKGROUND_INTERNET_NOISE',
  'GENERIC_SCANNER',
  'ENUMERATION',
  'CREDENTIAL_SCAN',
  'CRAWLER',
  'HEALTH_CHECK',
  'INTERNAL_ACCESS',
  'OPERATIONAL_ACCESS',
  'UNKNOWN'
]);

/**
 * @param {object} input
 * @returns {object}
 */
function createSecurityEventDto(input) {
  const now = new Date().toISOString();
  return Object.freeze({
    schema_version: 'security_event_v1',
    id: input.id || `se-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    event_type: input.event_type || 'PATH_DISCOVERY',
    classification: input.classification || 'UNKNOWN',
    window_start: input.window_start || now,
    window_end: input.window_end || now,
    source_ip: input.source_ip || null,
    source_asn: input.source_asn || null,
    user_agent: input.user_agent ? String(input.user_agent).slice(0, 256) : null,
    path_prefix: input.path_prefix || null,
    method: input.method || null,
    status_codes: input.status_codes || {},
    request_count: Number(input.request_count) || 0,
    bytes_total: Number(input.bytes_total) || 0,
    latency_ms_avg: input.latency_ms_avg != null ? Number(input.latency_ms_avg) : null,
    metadata: input.metadata || {},
    recorded_at: input.recorded_at || now
  });
}

function isValidEventType(t) {
  return EVENT_TYPES.includes(t);
}

function isValidClassification(c) {
  return CLASSIFICATIONS.includes(c);
}

module.exports = {
  EVENT_TYPES,
  CLASSIFICATIONS,
  createSecurityEventDto,
  isValidEventType,
  isValidClassification
};
