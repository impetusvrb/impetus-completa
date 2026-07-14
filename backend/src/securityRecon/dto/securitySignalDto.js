'use strict';

const SOURCE_LAYERS = Object.freeze([
  'NGINX_THREAT_WATCH',
  'SEC01_RUNTIME',
  'ANTI_SCANNER'
]);

const BEHAVIOR_STATES = Object.freeze([
  'OBSERVE',
  'SUSPECT',
  'THROTTLE',
  'CONTAIN'
]);

/**
 * @param {object} input
 * @returns {object}
 */
function createSecuritySignal(input) {
  const now = new Date().toISOString();
  const originalType = input.originalSignalType || input.signalType || 'PATH_DISCOVERY';

  return Object.freeze({
    schema_version: 'security_signal_v1',
    signalId: input.signalId || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: input.timestamp || now,
    requestId: input.requestId || null,
    sourceLayer: SOURCE_LAYERS.includes(input.sourceLayer) ? input.sourceLayer : 'SEC01_RUNTIME',
    signalType: input.signalType || originalType,
    originalSignalType: originalType,
    canonicalSignalType: input.canonicalSignalType || originalType,
    clientIp: input.clientIp || null,
    immediatePeerIp: input.immediatePeerIp || null,
    proxyResolutionSource: input.proxyResolutionSource || null,
    ipConfidence: input.ipConfidence || null,
    path: input.path ? String(input.path).split('?')[0] : null,
    method: input.method || null,
    statusCode: input.statusCode != null ? Number(input.statusCode) : null,
    credentialPresent: input.credentialPresent === true,
    sessionPresent: input.credentialPresent === true,
    authenticated: input.authenticated === true,
    serviceIdentityPresent: input.serviceIdentityPresent === true,
    spoofRisk: input.spoofRisk === true,
    companyId: input.companyId != null ? Number(input.companyId) : null,
    userId: input.userId != null ? Number(input.userId) : null,
    detectionConfidence: input.detectionConfidence != null ? Number(input.detectionConfidence) : null,
    metadata: sanitizeMetadata(input.metadata || {})
  });
}

function sanitizeMetadata(meta) {
  const out = { ...meta };
  const forbidden = [
    'authorization',
    'cookie',
    'token',
    'apiKey',
    'api_key',
    'password',
    'queryString'
  ];
  for (const key of forbidden) {
    delete out[key];
  }
  return out;
}

module.exports = {
  SOURCE_LAYERS,
  BEHAVIOR_STATES,
  createSecuritySignal,
  sanitizeMetadata
};
