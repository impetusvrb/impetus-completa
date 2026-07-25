'use strict';

/**
 * GF-026 — Cliente HTTP para APIs públicas WMS-003 (única fronteira operacional).
 */

const { SUPPLY_PILOT_BRIDGE_ENDPOINTS } = require('./supplyPilotContracts');
const { logSupplyPilotEvent } = require('./supplyPilotObservability');

async function fetchPublicOperationalEndpoint(endpointKey, ctx = {}) {
  const t0 = Date.now();
  const def = SUPPLY_PILOT_BRIDGE_ENDPOINTS[endpointKey];
  if (!def) {
    throw new Error(`unknown endpoint key: ${endpointKey}`);
  }

  if (ctx.mock_logistics_api && ctx.mock_logistics_api[endpointKey]) {
    logSupplyPilotEvent('API_MOCK', { contract: def.contract, endpoint: def.path, duration_ms: Date.now() - t0 });
    return Object.freeze({
      ok: true,
      mock: true,
      contract: def.contract,
      data: ctx.mock_logistics_api[endpointKey],
      meta: { source: 'mock', routing: 'public_api' }
    });
  }

  const base = ctx.api_base_url || process.env.IMPETUS_INTERNAL_API_BASE || '';
  if (!base) {
    return Object.freeze({
      ok: false,
      skipped: true,
      reason: 'no_api_base_url',
      contract: def.contract
    });
  }

  const url = `${base.replace(/\/$/, '')}/api/logistics-operational${def.path}`;
  const headers = { Accept: 'application/json', 'x-wms-api-test': '1' };
  if (ctx.auth_token) headers.Authorization = `Bearer ${ctx.auth_token}`;

  const res = await fetch(url, { method: def.method, headers });
  const body = await res.json();
  logSupplyPilotEvent(res.ok ? 'API_OK' : 'API_ERROR', {
    contract: def.contract,
    endpoint: def.path,
    duration_ms: Date.now() - t0,
    rejection: res.ok ? null : body.error
  });
  return Object.freeze({
    ok: body.ok === true,
    contract: def.contract,
    data: body.data,
    meta: body.meta || {},
    http_status: res.status
  });
}

async function fetchPilotLogisticsSnapshot(ctx = {}) {
  const keys = Object.keys(SUPPLY_PILOT_BRIDGE_ENDPOINTS);
  const out = {};
  for (const key of keys) {
    out[key] = await fetchPublicOperationalEndpoint(key, ctx);
  }
  return Object.freeze(out);
}

module.exports = {
  fetchPublicOperationalEndpoint,
  fetchPilotLogisticsSnapshot
};
