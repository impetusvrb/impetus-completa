'use strict';

/**
 * Resolvedor canónico de IP do cliente — delega a internalNetworkGovernance.
 * Única fonte para SEC-01, access log e Security Recon Correlation.
 */
const {
  resolveClientNetwork,
  normalizeIpString,
  isLoopbackIp
} = require('./internalNetworkGovernance');

function resolveLegacyClientIp(req) {
  const fwd =
    (req.get && req.get('x-forwarded-for')) ||
    req.headers?.['x-forwarded-for'] ||
    '';
  const first = String(fwd).split(',')[0].trim();
  return first || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/**
 * @param {import('express').Request} req
 * @returns {{
 *   clientIp: string,
 *   immediatePeerIp: string,
 *   proxyChain: string[],
 *   ipVersion: 4|6|null,
 *   resolutionSource: string,
 *   trustedProxy: boolean,
 *   confidence: 'high'|'medium'|'low',
 *   spoofRisk: boolean
 * }}
 */
function resolveCanonicalClientIp(req) {
  const network = resolveClientNetwork(req);
  const clientIp = network.ip || 'unknown';
  const immediatePeerIp =
    network.socketIp || normalizeIpString(req.socket?.remoteAddress) || '';

  let confidence = 'medium';
  if (network.spoofRisk) confidence = 'low';
  else if (network.proxyTrusted) confidence = 'high';
  else if (isLoopbackIp(clientIp)) confidence = 'high';

  return {
    clientIp,
    immediatePeerIp,
    proxyChain: network.forwardedChain || [],
    ipVersion: clientIp.includes(':') ? 6 : 4,
    resolutionSource: network.source || 'unknown',
    trustedProxy: network.proxyTrusted === true,
    confidence,
    spoofRisk: network.spoofRisk === true
  };
}

/** Comparação de regressão — legacy vs canónico. */
function resolveClientIpComparison(req) {
  const legacyResolvedIp = resolveLegacyClientIp(req);
  const canonical = resolveCanonicalClientIp(req);
  return {
    legacyResolvedIp,
    canonicalResolvedIp: canonical.clientIp,
    resolutionMatch: legacyResolvedIp === canonical.clientIp,
    canonical
  };
}

/** Atalho para consumidores que só precisam do IP. */
function resolveClientIp(req) {
  return resolveCanonicalClientIp(req).clientIp;
}

module.exports = {
  resolveClientIp,
  resolveLegacyClientIp,
  resolveCanonicalClientIp,
  resolveClientIpComparison,
  normalizeIpString,
  isLoopbackIp
};
