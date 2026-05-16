'use strict';

/**
 * INTERNAL NETWORK GOVERNANCE — CIDR allowlist, IP resolution, anti-spoof.
 *
 * Env:
 *   IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST  — CSV CIDRs (IPv4/IPv6)
 *   IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST — default true
 *   IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT — default false (legacy open); true = exige match
 *   IMPETUS_INTERNAL_ROUTE_TRUST_PROXY     — default true
 *   IMPETUS_TRUSTED_PROXY_CIDRS            — CSV CIDRs dos proxies (default loopback)
 *   IMPETUS_INTERNAL_IP_ALLOWLIST          — legado (mesclado ao parser CIDR)
 */

let ipaddr;
try {
  ipaddr = require('ipaddr.js');
} catch (_e) {
  ipaddr = null;
}

const LOCALHOST_CIDRS = Object.freeze([
  '127.0.0.1/32',
  '::1/128'
]);

const DEFAULT_TRUSTED_PROXY_CIDRS = Object.freeze([
  '127.0.0.1/32',
  '::1/128',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16'
]);

let _parsedAllowlistCache = null;
let _parsedTrustedProxyCache = null;
let _configCacheKey = '';

function envBool(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function parseCsvEnv(name) {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeIpString(ip) {
  if (!ip) return '';
  let s = String(ip).trim();
  if (s.startsWith('::ffff:')) s = s.slice(7);
  if (s === '::1') return '::1';
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  return s;
}

function parseCidrEntry(entry) {
  if (!ipaddr || !entry) return null;
  const raw = String(entry).trim();
  if (!raw) return null;
  try {
    if (raw.includes('/')) {
      const [addr, prefix] = ipaddr.parseCIDR(raw);
      return { addr, prefix, raw };
    }
    const addr = ipaddr.parse(raw);
    const prefix = addr.kind() === 'ipv6' ? 128 : 32;
    return { addr, prefix, raw, hostOnly: true };
  } catch (_e) {
    return null;
  }
}

function parseAllowlist(entries) {
  const parsed = [];
  for (const entry of entries) {
    const p = parseCidrEntry(entry);
    if (p) parsed.push(p);
  }
  return parsed;
}

function getConfig() {
  const key = [
    process.env.IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST,
    process.env.IMPETUS_INTERNAL_IP_ALLOWLIST,
    process.env.IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST,
    process.env.IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT,
    process.env.IMPETUS_INTERNAL_ROUTE_TRUST_PROXY,
    process.env.IMPETUS_TRUSTED_PROXY_CIDRS
  ].join('|');

  if (_configCacheKey === key && _parsedAllowlistCache) {
    return _parsedAllowlistCache;
  }

  const legacy = parseCsvEnv('IMPETUS_INTERNAL_IP_ALLOWLIST');
  const cidrs = parseCsvEnv('IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST');
  const merged = [...new Set([...cidrs, ...legacy])];

  const allowLocalhost = envBool(
    'IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST',
    true
  );

  const denyByDefault = envBool(
    'IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT',
    false
  );

  const trustProxy = envBool('IMPETUS_INTERNAL_ROUTE_TRUST_PROXY', true);

  const trustedProxyEntries = parseCsvEnv('IMPETUS_TRUSTED_PROXY_CIDRS');
  const trustedProxies = parseAllowlist(
    trustedProxyEntries.length > 0 ? trustedProxyEntries : [...DEFAULT_TRUSTED_PROXY_CIDRS]
  );

  let allowlistEntries = [...merged];
  if (allowLocalhost) {
    allowlistEntries = [...new Set([...allowlistEntries, ...LOCALHOST_CIDRS])];
  }

  const config = {
    allowLocalhost,
    denyByDefault,
    trustProxy,
    enforcementActive: denyByDefault || merged.length > 0,
    allowlistRaw: merged,
    allowlistParsed: parseAllowlist(allowlistEntries),
    trustedProxiesParsed: trustedProxies,
    ipaddrAvailable: !!ipaddr
  };

  _configCacheKey = key;
  _parsedAllowlistCache = config;
  _parsedTrustedProxyCache = trustedProxies;
  return config;
}

function ipMatchesCidr(ipStr, parsedList) {
  if (!ipaddr || !ipStr || !parsedList?.length) return { match: false, cidr: null };
  let addr;
  try {
    addr = ipaddr.parse(normalizeIpString(ipStr));
  } catch (_e) {
    return { match: false, cidr: null, invalid: true };
  }

  for (const entry of parsedList) {
    if (entry.addr.kind() !== addr.kind()) continue;
    if (entry.hostOnly && entry.addr.toString() === addr.toString()) {
      return { match: true, cidr: entry.raw };
    }
    if (!entry.hostOnly && addr.match(entry.addr, entry.prefix)) {
      return { match: true, cidr: entry.raw };
    }
  }
  return { match: false, cidr: null };
}

function isLoopbackIp(ipStr) {
  const n = normalizeIpString(ipStr);
  return n === '127.0.0.1' || n === '::1' || n === 'localhost';
}

/**
 * Resolve IP do cliente com anti-spoof de X-Forwarded-For.
 * @returns {{ ip: string, source: string, proxyTrusted: boolean, spoofRisk: boolean }}
 */
function resolveClientNetwork(req) {
  const config = getConfig();
  const socketIp = normalizeIpString(
    (req.socket && req.socket.remoteAddress) || req.connection?.remoteAddress || ''
  );

  const xffRaw = (req.get && req.get('x-forwarded-for')) || '';
  const xReal = (req.get && req.get('x-real-ip')) || '';
  const hasForwarded = !!(xffRaw || xReal);

  let proxyTrusted = false;
  if (config.trustProxy && socketIp) {
    const tp = ipMatchesCidr(socketIp, config.trustedProxiesParsed);
    proxyTrusted = tp.match;
  }

  if (!config.trustProxy || !proxyTrusted) {
    const spoofRisk = hasForwarded && socketIp && !isLoopbackIp(socketIp);
    return {
      ip: socketIp || '',
      source: 'socket',
      proxyTrusted: false,
      spoofRisk,
      socketIp
    };
  }

  if (xffRaw) {
    const chain = String(xffRaw)
      .split(',')
      .map((s) => normalizeIpString(s.trim()))
      .filter(Boolean);
    const clientIp = chain[0] || socketIp;
    return {
      ip: clientIp,
      source: 'x-forwarded-for',
      proxyTrusted: true,
      spoofRisk: false,
      socketIp,
      forwardedChain: chain
    };
  }

  if (xReal) {
    return {
      ip: normalizeIpString(xReal),
      source: 'x-real-ip',
      proxyTrusted: true,
      spoofRisk: false,
      socketIp
    };
  }

  return {
    ip: socketIp,
    source: 'socket-via-proxy',
    proxyTrusted: true,
    spoofRisk: false,
    socketIp
  };
}

/**
 * Avalia se o IP pode aceder a rotas internas.
 */
function evaluateNetworkAccess(req) {
  const config = getConfig();
  const network = resolveClientNetwork(req);

  if (network.spoofRisk) {
    return {
      allowed: false,
      reason: 'PROXY_SPOOF_RISK',
      code: 'INTERNAL_ROUTE_PROXY_MISMATCH',
      network,
      config: { enforcementActive: config.enforcementActive }
    };
  }

  if (!config.enforcementActive && !config.denyByDefault) {
    return {
      allowed: true,
      reason: 'LEGACY_OPEN',
      network,
      config: { enforcementActive: false }
    };
  }

  if (!config.ipaddrAvailable) {
    if (config.denyByDefault) {
      return {
        allowed: config.allowLocalhost && isLoopbackIp(network.ip),
        reason: 'IPADDR_MODULE_MISSING',
        code: 'INTERNAL_NETWORK_GUARD_UNAVAILABLE',
        network
      };
    }
    return { allowed: true, reason: 'IPADDR_MODULE_MISSING_PASS', network };
  }

  const match = ipMatchesCidr(network.ip, config.allowlistParsed);
  if (match.match) {
    return {
      allowed: true,
      reason: 'CIDR_MATCH',
      matchedCidr: match.cidr,
      network,
      config: { enforcementActive: config.enforcementActive }
    };
  }

  if (config.denyByDefault) {
    return {
      allowed: false,
      reason: 'DENY_BY_DEFAULT',
      code: 'INTERNAL_ROUTE_NETWORK_DENIED',
      network,
      config: { enforcementActive: true }
    };
  }

  if (config.allowlistRaw.length > 0) {
    return {
      allowed: false,
      reason: 'NOT_IN_ALLOWLIST',
      code: 'INTERNAL_ROUTE_NETWORK_DENIED',
      network
    };
  }

  return { allowed: true, reason: 'NO_ENFORCEMENT', network };
}

function getGovernanceStatus() {
  const config = getConfig();
  return {
    production: isProduction(),
    ipaddr_available: config.ipaddrAvailable,
    allow_localhost: config.allowLocalhost,
    deny_by_default: config.denyByDefault,
    trust_proxy: config.trustProxy,
    enforcement_active: config.enforcementActive,
    allowlist_count: config.allowlistRaw.length,
    allowlist_preview: config.allowlistRaw.slice(0, 20),
    trusted_proxy_count: config.trustedProxiesParsed.length
  };
}

function clearConfigCache() {
  _configCacheKey = '';
  _parsedAllowlistCache = null;
}

module.exports = {
  getConfig,
  resolveClientNetwork,
  evaluateNetworkAccess,
  getGovernanceStatus,
  ipMatchesCidr,
  normalizeIpString,
  isLoopbackIp,
  clearConfigCache,
  parseCidrEntry
};
