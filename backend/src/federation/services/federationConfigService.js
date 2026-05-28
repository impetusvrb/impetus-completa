'use strict';

const db = require('../../db');
const gov = require('../governance/federationGovernanceService');

async function getProviderById(providerId, companyId) {
  const r = await db.query(
    `SELECT * FROM tenant_federation_providers
     WHERE id = $1::uuid AND company_id = $2::uuid AND enabled = true`,
    [providerId, companyId]
  );
  return r.rows[0] || null;
}

async function getPrimaryProvider(companyId, providerType) {
  const r = await db.query(
    `SELECT * FROM tenant_federation_providers
     WHERE company_id = $1::uuid AND provider_type = $2 AND enabled = true
     ORDER BY updated_at DESC LIMIT 1`,
    [companyId, providerType]
  );
  return r.rows[0] || null;
}

async function listProviders(companyId) {
  const r = await db.query(
    `SELECT id, company_id, provider_type, enabled, display_name, mode,
            issuer_url, client_id, scopes, idp_entity_id, idp_sso_url,
            sp_entity_id, attribute_mapping, created_at, updated_at
     FROM tenant_federation_providers
     WHERE company_id = $1::uuid
     ORDER BY provider_type, display_name`,
    [companyId]
  );
  return r.rows;
}

async function upsertProvider(companyId, payload = {}) {
  const id = payload.id || null;
  const fields = {
    provider_type: payload.provider_type,
    enabled: payload.enabled !== false,
    display_name: payload.display_name || 'IdP Enterprise',
    mode: payload.mode || 'shadow',
    issuer_url: payload.issuer_url || null,
    client_id: payload.client_id || null,
    client_secret_env_key: payload.client_secret_env_key || null,
    scopes: payload.scopes || 'openid profile email',
    redirect_uri_override: payload.redirect_uri_override || null,
    idp_entity_id: payload.idp_entity_id || null,
    idp_sso_url: payload.idp_sso_url || null,
    idp_certificate_pem: payload.idp_certificate_pem || null,
    sp_entity_id: payload.sp_entity_id || null,
    acs_url_override: payload.acs_url_override || null,
    attribute_mapping: JSON.stringify(payload.attribute_mapping || {}),
    metadata: JSON.stringify(payload.metadata || {}),
  };

  if (id) {
    await db.query(
      `UPDATE tenant_federation_providers SET
         provider_type = COALESCE($3, provider_type),
         enabled = $4,
         display_name = $5,
         mode = $6,
         issuer_url = $7,
         client_id = $8,
         client_secret_env_key = $9,
         scopes = $10,
         redirect_uri_override = $11,
         idp_entity_id = $12,
         idp_sso_url = $13,
         idp_certificate_pem = $14,
         sp_entity_id = $15,
         acs_url_override = $16,
         attribute_mapping = $17::jsonb,
         metadata = $18::jsonb,
         updated_at = now()
       WHERE id = $1::uuid AND company_id = $2::uuid`,
      [
        id, companyId, fields.provider_type, fields.enabled, fields.display_name,
        fields.mode, fields.issuer_url, fields.client_id, fields.client_secret_env_key,
        fields.scopes, fields.redirect_uri_override, fields.idp_entity_id,
        fields.idp_sso_url, fields.idp_certificate_pem, fields.sp_entity_id,
        fields.acs_url_override, fields.attribute_mapping, fields.metadata,
      ]
    );
    return getProviderById(id, companyId);
  }

  const ins = await db.query(
    `INSERT INTO tenant_federation_providers
     (company_id, provider_type, enabled, display_name, mode, issuer_url, client_id,
      client_secret_env_key, scopes, redirect_uri_override, idp_entity_id, idp_sso_url,
      idp_certificate_pem, sp_entity_id, acs_url_override, attribute_mapping, metadata)
     VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb)
     RETURNING *`,
    [
      companyId, fields.provider_type, fields.enabled, fields.display_name, fields.mode,
      fields.issuer_url, fields.client_id, fields.client_secret_env_key, fields.scopes,
      fields.redirect_uri_override, fields.idp_entity_id, fields.idp_sso_url,
      fields.idp_certificate_pem, fields.sp_entity_id, fields.acs_url_override,
      fields.attribute_mapping, fields.metadata,
    ]
  );
  return ins.rows[0];
}

function resolveClientSecret(provider) {
  const key = provider?.client_secret_env_key;
  if (!key) return null;
  return process.env[key] || null;
}

function getEffectiveProviderMode(provider) {
  return gov.getEffectiveMode(provider?.mode);
}

module.exports = {
  getProviderById,
  getPrimaryProvider,
  listProviders,
  upsertProvider,
  resolveClientSecret,
  getEffectiveProviderMode,
};
