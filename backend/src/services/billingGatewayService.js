'use strict';

const db = require('../db');

const PROVIDER_LABELS = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
  asaas: 'Asaas',
  pagbank: 'PagBank',
  pagarme: 'Pagar.me',
  paypal: 'PayPal'
};

function sanitizeConfig(config) {
  const c = config && typeof config === 'object' ? { ...config } : {};
  delete c.secret_key;
  delete c.api_key;
  delete c.access_token;
  delete c.credentials;
  return c;
}

async function listGateways() {
  const r = await db.query(
    `SELECT provider, enabled, config, updated_at FROM billing_gateway_config ORDER BY provider`
  );
  return r.rows.map((g) => ({
    provider: g.provider,
    label: PROVIDER_LABELS[g.provider] || g.provider,
    enabled: g.enabled === true,
    config: sanitizeConfig(g.config || {}),
    updated_at: g.updated_at
  }));
}

async function updateGateway(provider, { enabled, config }, updatedBy) {
  const p = String(provider || '').toLowerCase();
  if (!PROVIDER_LABELS[p]) {
    const e = new Error('Gateway inválido');
    e.status = 400;
    throw e;
  }
  const r = await db.query(
    `UPDATE billing_gateway_config SET enabled = $2, config = $3::jsonb, updated_by = $4, updated_at = now()
     WHERE provider = $1 RETURNING provider, enabled, config, updated_at`,
    [p, enabled === true, JSON.stringify(sanitizeConfig(config || {})), updatedBy || null]
  );
  if (!r.rows[0]) {
    const e = new Error('Gateway não encontrado');
    e.status = 404;
    throw e;
  }
  return {
    provider: r.rows[0].provider,
    label: PROVIDER_LABELS[r.rows[0].provider],
    enabled: r.rows[0].enabled === true,
    config: sanitizeConfig(r.rows[0].config || {}),
    updated_at: r.rows[0].updated_at
  };
}

module.exports = { listGateways, updateGateway, PROVIDER_LABELS };
