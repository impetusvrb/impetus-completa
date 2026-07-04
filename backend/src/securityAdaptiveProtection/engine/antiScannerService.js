'use strict';

/**
 * SEC-11 — Anti-Scanner Recommendation Engine.
 * Detecta padrões de scan — recomendações only.
 */

const SCANNER_TYPES = Object.freeze([
  'enumeration',
  'credential_scan',
  'directory_scan',
  'source_scan',
  'bot_scanner',
  'cloud_scanner',
  'distributed_scanner'
]);

const CLASSIFICATION_MAP = {
  CREDENTIAL_SCAN: 'credential_scan',
  PATH_ENUMERATION: 'directory_scan',
  API_ENUMERATION: 'enumeration',
  API_PROBE: 'enumeration',
  RECONNAISSANCE: 'source_scan',
  BOT_SCAN: 'bot_scanner',
  CLOUD_SCANNER: 'cloud_scanner',
  GENERIC_SCAN: 'bot_scanner'
};

function detectScannerPatterns(incidents, sec10Patterns) {
  const detected = new Set();
  for (const inc of incidents || []) {
    const mapped = CLASSIFICATION_MAP[inc.classification];
    if (mapped) detected.add(mapped);
    const ips = inc.participants?.ips?.length || 0;
    if (ips >= 5) detected.add('distributed_scanner');
  }
  for (const p of sec10Patterns || []) {
    const name = (p.pattern || p || '').toLowerCase();
    if (name.includes('credential')) detected.add('credential_scan');
    if (name.includes('directory') || name.includes('enumeration')) detected.add('directory_scan');
    if (name.includes('bot')) detected.add('bot_scanner');
    if (name.includes('cloud')) detected.add('cloud_scanner');
    if (name.includes('distributed')) detected.add('distributed_scanner');
  }
  return [...detected];
}

function buildAntiScannerRecommendations(patterns) {
  const recs = [];
  const add = (action, rationale, priority = 'MEDIUM') => {
    recs.push({ action, rationale, priority, auto_execute: false, channel: 'recommended_plan' });
  };

  if (patterns.includes('enumeration') || patterns.includes('directory_scan')) {
    add('uniform_404_response', 'Responder 404 uniforme em paths inválidos');
    add('reduce_http_fingerprint', 'Reduzir fingerprint HTTP');
  }
  if (patterns.includes('credential_scan')) {
    add('increase_rate_limiting', 'Aumentar rate limiting em auth endpoints', 'HIGH');
    add('harden_express_auth', 'Endurecer middleware Express em login', 'HIGH');
  }
  if (patterns.includes('bot_scanner') || patterns.includes('distributed_scanner')) {
    add('increase_rate_limiting', 'Desacelerar scanners automatizados', 'HIGH');
    add('block_known_fingerprint', 'Bloquear fingerprint conhecido (requer aprovação)', 'HIGH');
  }
  if (patterns.includes('cloud_scanner')) {
    add('hide_banners', 'Ocultar banners de servidor');
    add('harden_nginx_headers', 'Endurecer headers nginx (requer aprovação ops)', 'MEDIUM');
  }
  if (patterns.includes('source_scan')) {
    add('reduce_http_fingerprint', 'Minimizar exposição de stack');
  }

  const seen = new Set();
  return recs.filter((r) => {
    if (seen.has(r.action)) return false;
    seen.add(r.action);
    return true;
  });
}

module.exports = {
  SCANNER_TYPES,
  detectScannerPatterns,
  buildAntiScannerRecommendations
};
