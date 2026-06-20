'use strict';

/**
 * FIX-SUBSCRIPTION-UX-01 — status read-only para auditoria UX de assinatura.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../..');

function _read(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

/**
 * @returns {Promise<{
 *   companies_me_available: boolean,
 *   subscription_status_available: boolean,
 *   recipient_resolver_available: boolean,
 *   company_inactive_code_aligned: boolean,
 *   banner_ready: boolean
 * }>}
 */
async function getSubscriptionUxAuditStatus() {
  const companiesRoute = _read('routes/companies.js');
  const multiTenant = _read('middleware/multiTenant.js');
  const layoutPath = path.join(__dirname, '../../../../frontend/src/components/Layout.jsx');
  const layoutSrc = fs.existsSync(layoutPath)
    ? fs.readFileSync(layoutPath, 'utf8')
    : '';

  const companiesMeAvailable =
    companiesRoute.includes("router.get('/me'") &&
    companiesRoute.includes('requireAuth') &&
    companiesRoute.includes('getCompanySubscriptionUxProfile');

  const subscriptionStatusAvailable =
    companiesRoute.includes('subscription_status') &&
    companiesRoute.includes('subscription_plan');

  let resolverAvailable = false;
  try {
    const resolver = require('./subscriptionRecipientResolver');
    resolverAvailable =
      typeof resolver.resolveFromCompanyRow === 'function' &&
      typeof resolver.resolveForCompany === 'function';
  } catch {
    resolverAvailable = false;
  }

  const companyInactiveAligned =
    multiTenant.includes("'COMPANY_INACTIVE'") &&
    multiTenant.includes("redirect: '/subscription-expired'");

  const bannerReady =
    layoutSrc.includes('companies.getMe()') &&
    layoutSrc.includes("subscription_status === 'overdue'") &&
    layoutSrc.includes('subscription-overdue-banner') &&
    companiesMeAvailable;

  return {
    companies_me_available: companiesMeAvailable,
    subscription_status_available: subscriptionStatusAvailable,
    recipient_resolver_available: resolverAvailable,
    company_inactive_code_aligned: companyInactiveAligned,
    banner_ready: bannerReady
  };
}

module.exports = {
  getSubscriptionUxAuditStatus
};
