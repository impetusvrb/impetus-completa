'use strict';

/**
 * Classificação de exposição de rotas — política anti-enumeração runtime.
 */
const PUBLIC_PREFIXES = Object.freeze([
  '/api/health',
  '/health',
  '/api/auth',
  '/api/companies',
  '/api/webhook',
  '/api/webhooks',
  '/api/federation',
  '/api/anam/public-config',
  '/api/integrations/edge/ingest',
  '/api/system/frontend-build',
  '/api/impetus-admin/auth'
]);

const ADMIN_SENSITIVE_PREFIXES = Object.freeze([
  '/api/impetus-admin/security-dashboard',
  '/api/impetus-admin'
]);

const EDGE_INGEST_PREFIXES = Object.freeze([
  '/api/integrations/edge/ingest'
]);

const HEALTH_PREFIXES = Object.freeze([
  '/api/health',
  '/health'
]);

function classifyRoute(path) {
  const p = String(path || '').split('?')[0];
  if (HEALTH_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) return 'HEALTH_INTERNAL';
  if (EDGE_INGEST_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) return 'EDGE_INGEST';
  if (ADMIN_SENSITIVE_PREFIXES.some((x) => p.startsWith(x))) return 'ADMIN_SENSITIVE';
  if (p.startsWith('/api/internal')) return 'INTERNAL_SERVICE';
  if (PUBLIC_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) return 'PUBLIC';
  if (p.startsWith('/api/')) return 'AUTHENTICATED';
  return 'PUBLIC';
}

function isPublicContractRoute(path) {
  return classifyRoute(path) === 'PUBLIC' || classifyRoute(path) === 'EDGE_INGEST' ||
    classifyRoute(path) === 'HEALTH_INTERNAL';
}

function isContainmentCandidate(path, authenticated) {
  if (authenticated) return false;
  const cat = classifyRoute(path);
  if (cat === 'PUBLIC' || cat === 'EDGE_INGEST' || cat === 'HEALTH_INTERNAL') return false;
  if (cat === 'ADMIN_SENSITIVE' || cat === 'INTERNAL_SERVICE') return true;
  if (cat === 'AUTHENTICATED') return true;
  return false;
}

module.exports = {
  classifyRoute,
  isPublicContractRoute,
  isContainmentCandidate,
  PUBLIC_PREFIXES,
  ADMIN_SENSITIVE_PREFIXES
};
