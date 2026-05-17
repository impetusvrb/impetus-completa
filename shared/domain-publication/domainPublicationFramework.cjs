'use strict';

/**
 * Domain publication framework (genérico) consolidado a partir do QUALITY.
 * Reutilizável por SST, Ambiental, Logística, etc.
 */

/**
 * @param {object} p
 * @param {boolean} [p.operationalRuntime]
 * @param {boolean} [p.navigationRuntime]
 * @param {boolean} [p.publicationRuntime]
 * @param {boolean} [p.moduleLicensed]
 * @param {string|null} [p.tenantId]
 */
function evaluatePublicationReadiness(p) {
  const reasons = [];
  if (!p.tenantId) reasons.push('tenant_missing');
  if (!p.operationalRuntime) reasons.push('operational_off');
  if (!p.navigationRuntime) reasons.push('navigation_off');
  if (!p.publicationRuntime) reasons.push('publication_off');
  if (!p.moduleLicensed) reasons.push('module_not_licensed');
  return {
    ready: reasons.length === 0,
    reasons
  };
}

/**
 * @param {string} pathname
 * @param {string} routePrefix e.g. /app/quality
 */
function pathBelongsToDomain(pathname, routePrefix) {
  const n = String(pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  const px = String(routePrefix || '').replace(/\/+$/, '') || '/';
  return n === px || n.startsWith(`${px}/`);
}

module.exports = {
  evaluatePublicationReadiness,
  pathBelongsToDomain
};
