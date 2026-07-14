'use strict';

/** Marcador module-scoped — não activável via header ou propriedade pública arbitrária. */
const VALIDATED_SERVICE_SYMBOL = Symbol('impetus.sec.recon.validatedService');

/**
 * Marca identidade de serviço validada por mecanismo oficial interno.
 * @param {object} req
 * @param {{ source: string, edgeId?: string, companyId?: number|string }} context
 */
function markValidatedServiceIdentity(req, context) {
  if (!req || !context?.source) return;
  Object.defineProperty(req, VALIDATED_SERVICE_SYMBOL, {
    value: Object.freeze({
      source: String(context.source),
      edgeId: context.edgeId || null,
      companyId: context.companyId != null ? context.companyId : null,
      markedAt: Date.now()
    }),
    enumerable: false,
    configurable: false,
    writable: false
  });
}

function getValidatedServiceIdentity(req) {
  if (!req) return null;
  return req[VALIDATED_SERVICE_SYMBOL] || null;
}

function hasValidatedServiceIdentity(req) {
  return getValidatedServiceIdentity(req) != null;
}

module.exports = {
  markValidatedServiceIdentity,
  getValidatedServiceIdentity,
  hasValidatedServiceIdentity
};
