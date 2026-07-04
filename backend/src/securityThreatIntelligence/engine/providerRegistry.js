'use strict';

/**
 * SEC-03 — Registo interno de provedores/infra (sem feeds externos).
 * Heurísticas determinísticas baseadas em IP, ASN e UA conhecidos do IMPETUS.
 */

const CLOUD_PROVIDERS = Object.freeze([
  {
    id: 'aws',
    name: 'Amazon Web Services',
    ipPrefixes: ['3.', '13.', '18.', '34.', '35.', '44.', '52.', '54.', '107.20.', '107.21.'],
    asnKeywords: ['amazon', 'aws'],
    scannerLikelihood: 0.7
  },
  {
    id: 'vultr',
    name: 'Vultr',
    ipPrefixes: ['45.32.', '45.33.', '45.76.', '45.77.', '139.28.', '149.28.', '149.248.'],
    asnKeywords: ['vultr', 'choopa'],
    scannerLikelihood: 0.65
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    ipPrefixes: ['104.131.', '134.122.', '138.68.', '159.65.', '167.99.', '178.128.'],
    asnKeywords: ['digitalocean'],
    scannerLikelihood: 0.6
  },
  {
    id: 'google_cloud',
    name: 'Google Cloud',
    ipPrefixes: ['34.', '35.', '104.196.', '104.197.', '130.211.'],
    asnKeywords: ['google'],
    scannerLikelihood: 0.55
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    ipPrefixes: ['13.', '20.', '40.', '52.', '104.40.', '104.41.'],
    asnKeywords: ['microsoft', 'azure'],
    scannerLikelihood: 0.55
  }
]);

function matchIpPrefix(ip, prefix) {
  if (!ip || !prefix) return false;
  return String(ip).startsWith(prefix);
}

/**
 * @param {string} ip
 * @param {string[]} [asns]
 * @returns {object|null}
 */
function resolveProvider(ip, asns = []) {
  const asnLower = (asns || []).map((a) => String(a).toLowerCase());

  for (const provider of CLOUD_PROVIDERS) {
    if (provider.ipPrefixes.some((p) => matchIpPrefix(ip, p))) {
      return { ...provider, matchType: 'ip_prefix', confidence: 0.75 };
    }
    if (asnLower.some((a) => provider.asnKeywords.some((k) => a.includes(k)))) {
      return { ...provider, matchType: 'asn_keyword', confidence: 0.85 };
    }
  }
  return null;
}

function resolveProvidersForIncident(incident) {
  const ips = incident.participants?.ips || [];
  const asns = incident.participants?.asns || [];
  const seen = new Map();

  for (const ip of ips) {
    const p = resolveProvider(ip, asns);
    if (p && !seen.has(p.id)) seen.set(p.id, { ...p, matchedIp: ip });
  }

  return [...seen.values()];
}

module.exports = {
  CLOUD_PROVIDERS,
  resolveProvider,
  resolveProvidersForIncident
};
