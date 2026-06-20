'use strict';

/**
 * FIX-SUBSCRIPTION-UX-01 — resolver central read-only de destinatários financeiros.
 * Prioriza campos modernos; mantém compatibilidade com legado Asaas/billing.
 */

const subscriptionCompanyReader = require('./subscriptionCompanyReader');

function _trim(v) {
  if (v == null) return '';
  return String(v).trim();
}

function _billingEmailFromConfig(config) {
  if (!config || typeof config !== 'object') return '';
  return _trim(config.billing_email);
}

/**
 * Resolve destinatário financeiro a partir de linha companies (somente leitura).
 * @param {object|null|undefined} companyRow
 * @returns {{ email: string, phone: string, source: string, name: string }}
 */
function resolveFromCompanyRow(companyRow) {
  if (!companyRow || typeof companyRow !== 'object') {
    return { email: '', phone: '', source: 'none', name: '' };
  }

  const modernEmail = _trim(companyRow.email_responsavel);
  const legacyEmail = _trim(companyRow.data_controller_email);
  const configEmail = _billingEmailFromConfig(companyRow.config);

  const modernPhone = _trim(companyRow.telefone_responsavel);
  const legacyPhone = _trim(companyRow.data_controller_phone);

  const modernName = _trim(companyRow.nome_responsavel);
  const legacyName = _trim(companyRow.data_controller_name);

  let email = '';
  let phone = '';
  let source = 'none';

  if (modernEmail) {
    email = modernEmail;
    source = 'email_responsavel';
  } else if (legacyEmail) {
    email = legacyEmail;
    source = 'data_controller_email';
  } else if (configEmail) {
    email = configEmail;
    source = 'config.billing_email';
  }

  if (modernPhone) {
    phone = modernPhone;
    if (source === 'none') source = 'telefone_responsavel';
  } else if (legacyPhone) {
    phone = legacyPhone;
    if (source === 'none') source = 'data_controller_phone';
  }

  const name = modernName || legacyName || '';

  return { email, phone, source, name };
}

/**
 * @param {string} companyId
 * @returns {Promise<{ email: string, phone: string, source: string, name: string }>}
 */
async function resolveForCompany(companyId) {
  const row = await subscriptionCompanyReader.loadCompanyRow(companyId);
  return resolveFromCompanyRow(row);
}

module.exports = {
  resolveFromCompanyRow,
  resolveForCompany
};
