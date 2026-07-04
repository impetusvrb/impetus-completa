'use strict';

/**
 * SEC-01 — Classificação determinística (sem IA generativa).
 */

const SCANNER_PATH_RE =
  /(?:^|\/)(?:\.env|docker-compose|server\.js|package\.json|credentials|secrets|wp-admin|phpmyadmin|\.git|actuator|config\.(?:js|json|ya?ml)|appsettings)/i;

const BOT_UA_RE =
  /bot|crawler|spider|scan|curl|wget|python-requests|Go-http-client|GPTBot|Claude-SearchBot|Semrush|Ahrefs|nikto|sqlmap|masscan|zgrab|Silvy X Ran/i;

const CRAWLER_UA_RE = /GPTBot|Claude-SearchBot|Googlebot|bingbot|anthropic/i;

/** @param {object} ctx */
function classifyHttpAggregate(ctx) {
  const {
    path = '',
    statusCodes = {},
    requestCount = 0,
    userAgent = '',
    sourceIp = '',
    trustedIp = false
  } = ctx;

  const total = requestCount || Object.values(statusCodes).reduce((a, b) => a + b, 0);
  const s404 = statusCodes[404] || statusCodes['404'] || 0;
  const s401 = statusCodes[401] || statusCodes['401'] || 0;
  const s403 = statusCodes[403] || statusCodes['403'] || 0;
  const s444 = statusCodes[444] || statusCodes['444'] || 0;
  const s200 = statusCodes[200] || statusCodes['200'] || 0;

  if (path === '/health' || path.startsWith('/health')) {
    return { classification: 'HEALTH_CHECK', event_type: 'HTTP_SCAN' };
  }

  if (trustedIp) {
    return { classification: 'OPERATIONAL_ACCESS', event_type: 'PATH_DISCOVERY' };
  }

  if (sourceIp === '127.0.0.1' || sourceIp === '::1') {
    return { classification: 'INTERNAL_ACCESS', event_type: 'PATH_DISCOVERY' };
  }

  if (CRAWLER_UA_RE.test(userAgent)) {
    return { classification: 'CRAWLER', event_type: 'BOT_ACTIVITY' };
  }

  if (SCANNER_PATH_RE.test(path)) {
    return { classification: 'CREDENTIAL_SCAN', event_type: 'HTTP_SCAN' };
  }

  if (path.startsWith('/api/auth') || s401 > 0) {
    return { classification: 'ENUMERATION', event_type: 'AUTH_ATTEMPT' };
  }

  if (BOT_UA_RE.test(userAgent)) {
    return { classification: 'GENERIC_SCANNER', event_type: 'BOT_ACTIVITY' };
  }

  if (s404 + s444 > total * 0.7 && total >= 5) {
    return { classification: 'ENUMERATION', event_type: 'ENUMERATION' };
  }

  if (total >= 50 && s404 / total > 0.5) {
    return { classification: 'BACKGROUND_INTERNET_NOISE', event_type: 'HTTP_SCAN' };
  }

  if (path.startsWith('/assets/')) {
    return { classification: 'CRAWLER', event_type: 'ASSET_DISCOVERY' };
  }

  if (s403 > 0) {
    return { classification: 'GENERIC_SCANNER', event_type: 'HTTP_SCAN' };
  }

  return { classification: 'UNKNOWN', event_type: 'PATH_DISCOVERY' };
}

/** Classifica evento externo (SSH, PM2, etc.) */
function classifyExternalEvent(type, metadata = {}) {
  const map = {
    SSH_EVENT: { classification: metadata.success === false ? 'GENERIC_SCANNER' : 'OPERATIONAL_ACCESS', event_type: 'SSH_EVENT' },
    PM2_EVENT: { classification: 'INTERNAL_ACCESS', event_type: 'PM2_EVENT' },
    FILE_INTEGRITY: { classification: 'OPERATIONAL_ACCESS', event_type: 'FILE_INTEGRITY' },
    CONFIG_CHANGE: { classification: 'OPERATIONAL_ACCESS', event_type: 'CONFIG_CHANGE' },
    PROCESS_CHANGE: { classification: 'INTERNAL_ACCESS', event_type: 'PROCESS_CHANGE' },
    NETWORK_CHANGE: { classification: 'UNKNOWN', event_type: 'NETWORK_CHANGE' },
    TLS_EVENT: { classification: 'HEALTH_CHECK', event_type: 'TLS_EVENT' }
  };
  return map[type] || { classification: 'UNKNOWN', event_type: type || 'PATH_DISCOVERY' };
}

module.exports = {
  classifyHttpAggregate,
  classifyExternalEvent,
  SCANNER_PATH_RE,
  BOT_UA_RE
};
