'use strict';

/**
 * SEC-03 — Threat Indicators (determinísticos).
 */

const KNOWN_SCANNER_UA = /nikto|sqlmap|masscan|zgrab|nmap|acunetix|nessus|dirbuster|gobuster|wfuzz|ffuf|nuclei/i;

/**
 * @param {object} incident — read-only SEC-02 incident
 * @returns {object[]}
 */
function extractThreatIndicators(incident) {
  const indicators = [];
  const m = incident.metrics || {};
  const sc = m.statusCodes || {};
  const s404 = sc[404] || sc['404'] || 0;
  const total = m.requestCount || 0;
  const uas = incident.participants?.userAgents || [];
  const durationMs = incident.durationMs || 0;

  const add = (code, label, level, detail) => {
    indicators.push({ code, label, level, detail: detail || '' });
  };

  if (incident.classification === 'CREDENTIAL_SCAN') {
    add('CREDENTIAL_SCAN', 'Credential Scan', 'Likely', 'Paths de credenciais/config detectados');
  }

  if (incident.classification === 'ENUMERATION' || incident.classification === 'GENERIC_SCANNER') {
    add('ENUMERATION', 'Enumeration', 'Likely', 'Enumeração de endpoints');
  }

  if (incident.timeline?.some((t) => t.phase === 'RECONNAISSANCE')) {
    add('RECONNAISSANCE', 'Reconnaissance', 'Possible', 'Fase de reconhecimento na timeline');
  }

  if (total > 0 && s404 / total > 0.7) {
    add('MASSIVE_404', 'Massive 404', 'Likely', `${Math.round((s404 / total) * 100)}% respostas 404`);
  }

  if (m.uniquePaths >= 10) {
    add('ASSET_DISCOVERY', 'Asset Discovery', 'Possible', `${m.uniquePaths} paths únicos`);
  }

  if (total >= 5000) {
    add('RATE_SPIKE', 'Rate Spike', 'Likely', `${total} requests agregados`);
  }

  if (durationMs >= 3600000) {
    add('LONG_DURATION', 'Long Duration', 'Likely', `Duração ${Math.round(durationMs / 3600000)}h`);
  }

  if (durationMs >= 7200000) {
    add('PERSISTENCE', 'Persistence', 'Likely', 'Actividade sustentada >2h');
  }

  if (m.eventCount >= 20) {
    add('MULTI_WINDOW', 'Multi Window', 'Possible', `${m.eventCount} janelas de evento`);
  }

  for (const ua of uas) {
    if (KNOWN_SCANNER_UA.test(ua)) {
      add('KNOWN_SCANNER', 'Scanner conhecido', 'Confirmed', `UA: ${String(ua).slice(0, 80)}`);
      break;
    }
    if (/bot|crawler|spider|scan|curl|wget|python-requests|Go-http-client/i.test(ua)) {
      add('AUTOMATED_CLIENT', 'Cliente automatizado', 'Likely', `UA: ${String(ua).slice(0, 80)}`);
      break;
    }
  }

  const providers = require('./providerRegistry').resolveProvidersForIncident(incident);
  if (providers.length > 0) {
    add('CLOUD_PROVIDER', 'Cloud Provider', 'Likely', providers.map((p) => p.name).join(', '));
  }

  if (incident.classification === 'CRAWLER') {
    add('LEGITIMATE_CRAWLER', 'Crawler legítimo', 'Possible', 'Classificação SEC-01: CRAWLER');
  }

  if (incident.classification === 'OPERATIONAL_ACCESS') {
    add('AUTHORIZED_OPERATOR', 'Operador autorizado', 'Likely', 'IP/operador de confiança');
  }

  return indicators;
}

module.exports = { extractThreatIndicators, KNOWN_SCANNER_UA };
