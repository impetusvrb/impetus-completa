'use strict';

const { resolveIdentityContext } = require('./identityContext');
const { hasValidatedServiceIdentity, getValidatedServiceIdentity } = require('./serviceIdentityMarker');

/**
 * Contexto de identidade APÓS validação oficial.
 * @param {object} req
 * @param {{ validationSource?: string, identityType?: string }} meta
 */
function buildValidatedIdentityContext(req, meta = {}) {
  const base = resolveIdentityContext(req);
  const serviceCtx = getValidatedServiceIdentity(req);

  let identityType = 'ANONYMOUS';
  if (base.authenticatedIdentity && req?.adminUser) identityType = 'ADMIN';
  else if (base.authenticatedIdentity && req?.user) identityType = 'USER';
  else if (serviceCtx) identityType = 'EDGE';
  else if (meta.identityType) identityType = meta.identityType;

  return {
    credentialPresent: base.credentialPresent,
    authenticatedIdentity: base.authenticatedIdentity || !!serviceCtx,
    serviceIdentityValidated: hasValidatedServiceIdentity(req),
    identityType,
    userId: req?.user?.id || req?.user?.user_id || null,
    adminId: req?.adminUser?.id || null,
    companyId: req?.user?.company_id || serviceCtx?.companyId || null,
    validationSource: meta.validationSource || serviceCtx?.source || null,
    identityStage: 'validated'
  };
}

module.exports = {
  buildValidatedIdentityContext
};
