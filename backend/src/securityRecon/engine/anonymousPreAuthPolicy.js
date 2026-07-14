'use strict';

const { classifyRoute } = require('./routeExposurePolicy');

/**
 * Enforcement pre-auth para rotas anónimas/públicas — apenas sinais fortes.
 */
function canEnforcePreAuth(state, pathOnly) {
  if (!state) return false;
  if (state.externalBanObserved === true) return true;

  const category = classifyRoute(pathOnly);

  if (category === 'HEALTH_INTERNAL') return false;

  const strongProbe =
    state.probeHits >= 2 &&
    (state.distinctPaths.size >= 5 || state.notFoundCount >= 10);

  if (category === 'PUBLIC' || category === 'EDGE_INGEST') {
    return strongProbe;
  }

  return false;
}

function classifyPublicExposure(path) {
  const p = String(path || '').split('?')[0];
  const cat = classifyRoute(p);

  if (cat === 'HEALTH_INTERNAL') return 'PUBLIC_EXPECTED';
  if (p.startsWith('/api/auth')) return 'PUBLIC_EXPECTED';
  if (p.startsWith('/api/anam/public-config')) return 'PUBLIC_EXPECTED';
  if (p.startsWith('/api/system/frontend-build')) return 'PUBLIC_EXPECTED';
  if (p.startsWith('/api/companies')) return 'PUBLIC_SENSITIVE';
  if (p.startsWith('/api/federation')) return 'PUBLIC_SENSITIVE';
  if (cat === 'EDGE_INGEST') return 'EDGE_AUTHENTICATED';
  if (cat === 'PUBLIC') return 'PUBLIC_EXPECTED';
  return 'UNKNOWN';
}

module.exports = {
  canEnforcePreAuth,
  classifyPublicExposure
};
