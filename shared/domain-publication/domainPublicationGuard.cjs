'use strict';

const { pathBelongsToDomain } = require('./domainPublicationFramework.cjs');

/**
 * @param {object} ctx
 * @param {string} ctx.pathname
 * @param {string} ctx.routePrefix
 * @param {boolean} ctx.publicationAllowed
 */
function assertPublicationPathAllowed(ctx) {
  if (!pathBelongsToDomain(ctx.pathname, ctx.routePrefix)) return { ok: true, reason: null };
  if (!ctx.publicationAllowed) return { ok: false, reason: 'publication_denied' };
  return { ok: true, reason: null };
}

module.exports = { assertPublicationPathAllowed, pathBelongsToDomain };
