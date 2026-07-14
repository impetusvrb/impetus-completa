'use strict';

/**
 * Contexto de identidade para SEC-RECON — distingue presença de credencial
 * de identidade validada pelo mecanismo oficial.
 *
 * CREDENTIAL_PRESENT != AUTHENTICATED_IDENTITY
 */

const {
  hasValidatedServiceIdentity: hasServiceMarker,
  getValidatedServiceIdentity
} = require('./serviceIdentityMarker');

function credentialPresent(req) {
  if (!req) return false;
  const auth = req.headers?.authorization || (req.get && req.get('authorization')) || '';
  if (String(auth).trim()) return true;
  const cookie = req.headers?.cookie || '';
  return /impetus.*session|connect\.sid|token=/i.test(cookie);
}

/** JWT/sessão tenant validada por requireAuth → req.user */
function hasValidatedTenantIdentity(req) {
  if (!req?.user) return false;
  return !!(req.user.id || req.user.user_id);
}

/** Admin portal validado por requireAdminAuth → req.adminUser */
function hasValidatedAdminIdentity(req) {
  if (!req?.adminUser) return false;
  return !!(req.adminUser.id || req.adminUser.admin_id);
}

function hasValidatedServiceIdentity(req) {
  return hasServiceMarker(req);
}

/**
 * @param {import('express').Request} req
 */
function resolveIdentityContext(req) {
  const tenant = hasValidatedTenantIdentity(req);
  const admin = hasValidatedAdminIdentity(req);
  const service = hasValidatedServiceIdentity(req);
  const validated = tenant || admin || service;
  const serviceCtx = getValidatedServiceIdentity(req);

  return {
    credentialPresent: credentialPresent(req),
    authenticatedIdentity: validated,
    serviceIdentityValidated: service,
    userId: req?.user?.id || req?.user?.user_id || req?.adminUser?.id || null,
    companyId: req?.user?.company_id || serviceCtx?.companyId || null,
    identityStage: validated ? 'validated' : 'pre_auth'
  };
}

module.exports = {
  credentialPresent,
  hasValidatedTenantIdentity,
  hasValidatedAdminIdentity,
  hasValidatedServiceIdentity,
  resolveIdentityContext
};
