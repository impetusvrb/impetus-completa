'use strict';

/**
 * Internal Network Governance — CIDR, anti-spoof, localhost, feature flags.
 * node src/tests/enterpriseInternalNetworkScenarios.js
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function mockReq(overrides = {}) {
  return {
    headers: overrides.headers || {},
    get(h) {
      const k = String(h).toLowerCase();
      return this.headers[k] || this.headers[h] || undefined;
    },
    socket: { remoteAddress: overrides.remoteAddress || '127.0.0.1' },
    originalUrl: overrides.originalUrl || '/api/internal/test',
    method: overrides.method || 'GET',
    user: overrides.user || null,
    ...overrides
  };
}

function runGuard(req, env = {}) {
  const prev = { ...process.env };
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../services/internalNetworkGovernance')];
  delete require.cache[require.resolve('../middleware/internalNetworkGuard')];
  const { requireInternalNetworkAccess } = require('../middleware/internalNetworkGuard');
  const guard = requireInternalNetworkAccess({ label: 'test', skipInDev: false });

  let statusCode = 200;
  let body = null;
  let nextCalled = false;
  const res = {
    status(c) {
      statusCode = c;
      return this;
    },
    json(p) {
      body = p;
      return this;
    }
  };

  guard(req, res, () => {
    nextCalled = true;
  });

  Object.keys(env).forEach((k) => {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  });
  require('../services/internalNetworkGovernance').clearConfigCache();

  return { statusCode, body, nextCalled };
}

(async () => {
  console.log('\n══ INTERNAL NETWORK GOVERNANCE — TESTES ══\n');

  const gov = require('../services/internalNetworkGovernance');

  ok('N1.1 ipaddr disponível', !!require('ipaddr.js'));

  const m1 = gov.ipMatchesCidr('10.5.6.7', gov.getConfig().allowlistParsed.length ? [] : []);
  const parsed10 = gov.parseCidrEntry('10.0.0.0/8');
  const match10 = gov.ipMatchesCidr('10.5.6.7', [parsed10]);
  ok('N1.2 CIDR 10.0.0.0/8 match 10.5.6.7', match10.match === true);

  const parsed127 = gov.parseCidrEntry('127.0.0.1/32');
  ok('N1.3 loopback /32 match', gov.ipMatchesCidr('127.0.0.1', [parsed127]).match === true);

  const parsedV6 = gov.parseCidrEntry('::1/128');
  ok('N1.4 IPv6 ::1/128 match', gov.ipMatchesCidr('::1', [parsedV6]).match === true);

  process.env.NODE_ENV = 'test';
  process.env.IMPETUS_INTERNAL_NETWORK_DEV_BYPASS = 'false';
  process.env.IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT = 'false';
  process.env.IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST = '';
  gov.clearConfigCache();

  const open = runGuard(mockReq({ remoteAddress: '8.8.8.8' }), {
    NODE_ENV: 'test',
    IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
    IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'false'
  });
  ok('N2.1 legacy open (sem deny, sem lista) permite', open.nextCalled === true);

  const deny = runGuard(mockReq({ remoteAddress: '8.8.8.8' }), {
    NODE_ENV: 'production',
    IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
    IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'true',
    IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST: 'true',
    IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST: ''
  });
  ok('N2.2 deny_by_default bloqueia IP externo', deny.nextCalled === false && deny.statusCode === 403);

  const localhost = runGuard(mockReq({ remoteAddress: '127.0.0.1' }), {
    NODE_ENV: 'production',
    IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
    IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'true',
    IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST: 'true'
  });
  ok('N2.3 localhost permitido com ALLOW_LOCALHOST', localhost.nextCalled === true);

  const cidrAllow = runGuard(mockReq({ remoteAddress: '192.168.1.50' }), {
    NODE_ENV: 'production',
    IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
    IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'true',
    IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST: '192.168.0.0/16',
    IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST: 'false'
  });
  ok('N2.4 CIDR 192.168.0.0/16 permite 192.168.1.50', cidrAllow.nextCalled === true);

  const spoof = runGuard(
    mockReq({
      remoteAddress: '203.0.113.1',
      headers: { 'x-forwarded-for': '10.0.0.1' }
    }),
    {
      NODE_ENV: 'production',
      IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
      IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'false',
      IMPETUS_INTERNAL_ROUTE_TRUST_PROXY: 'true',
      IMPETUS_TRUSTED_PROXY_CIDRS: '127.0.0.1/32'
    }
  );
  ok(
    'N3.1 anti-spoof: XFF de socket não confiável',
    spoof.nextCalled === false && spoof.body?.code === 'INTERNAL_ROUTE_PROXY_MISMATCH'
  );

  const trustedProxy = runGuard(
    mockReq({
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '10.0.0.5' }
    }),
    {
      NODE_ENV: 'production',
      IMPETUS_INTERNAL_NETWORK_DEV_BYPASS: 'false',
      IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT: 'true',
      IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST: '10.0.0.0/8',
      IMPETUS_INTERNAL_ROUTE_TRUST_PROXY: 'true',
      IMPETUS_TRUSTED_PROXY_CIDRS: '127.0.0.1/32',
      IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST: 'false'
    }
  );
  ok('N3.2 proxy confiável + XFF 10.0.0.5 em /8', trustedProxy.nextCalled === true);

  const status = gov.getGovernanceStatus();
  ok('N4.1 governance status object', typeof status.enforcement_active === 'boolean');

  const { requireInternalAccess } = require('../middleware/internalRouteGuard');
  const acl = requireInternalAccess({ label: 't' });
  const adminReq = mockReq({
    user: { id: 'a', role: 'internal_admin', company_id: 'c1' }
  });
  let aclNext = false;
  acl(adminReq, { status: () => ({ json: () => {} }), setHeader: () => {} }, () => {
    aclNext = true;
  });
  ok('N5.1 requireInternalAccess ainda permite admin', aclNext === true);

  console.log(`\n══ RESULTADO: ${passed} ok | ${failed} falhas ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
