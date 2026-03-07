/**
 * MODEL COMPANY INTEGRATION
 * Abstração multi-provedor para integrações WhatsApp (Z-API, futura Meta Cloud API)
 * Isolamento por empresa (multi-tenant)
 */

const db = require('../db');

const PROVIDERS = {
  ZAPI: 'zapi'
};

/**
 * Busca integração ativa da empresa (atualmente Z-API)
 */
async function getByCompany(companyId, provider = PROVIDERS.ZAPI) {
  if (provider !== PROVIDERS.ZAPI) {
    throw new Error(`Provedor não implementado: ${provider}`);
  }
  const r = await db.query(`
    SELECT id, company_id, instance_id, api_url, business_phone,
           webhook_url, integration_status, connection_status, active,
           last_connection_test, created_at, updated_at
    FROM zapi_configurations
    WHERE company_id = $1
  `, [companyId]);
  return r.rows[0] || null;
}

/**
 * Cria ou atualiza integração Z-API
 */
async function upsertZApi(companyId, data) {
  const {
    instance_id,
    instance_token,
    client_token,
    api_url = 'https://api.z-api.io',
    webhook_url,
    business_phone = null
  } = data;

  const existing = await db.query(
    'SELECT id FROM zapi_configurations WHERE company_id = $1',
    [companyId]
  );

  const { encrypt } = require('../utils/crypto');
  const maybeEncrypt = (v) => {
    if (!v) return v;
    try {
      return process.env.ENCRYPTION_KEY ? encrypt(String(v)) : v;
    } catch {
      return v;
    }
  };

  if (existing.rows.length > 0) {
    await db.query(`
      UPDATE zapi_configurations
      SET instance_id = $1, instance_token = $2, client_token = $3,
          api_url = $4, webhook_url = $5, business_phone = COALESCE($6, business_phone),
          integration_status = 'pending', connection_status = 'pending',
          active = true, updated_at = now()
      WHERE company_id = $7
    `, [instance_id, maybeEncrypt(instance_token), maybeEncrypt(client_token), api_url, webhook_url, business_phone, companyId]);
    const r = await db.query('SELECT * FROM zapi_configurations WHERE company_id = $1', [companyId]);
    return r.rows[0];
  }

  const r = await db.query(`
    INSERT INTO zapi_configurations (
      company_id, instance_id, instance_token, client_token,
      api_url, webhook_url, business_phone,
      integration_status, connection_status, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending', true)
    RETURNING *
  `, [companyId, instance_id, maybeEncrypt(instance_token), maybeEncrypt(client_token), api_url, webhook_url, business_phone]);
  return r.rows[0];
}

/**
 * Atualiza status para conectado (após scan do QR)
 */
async function markConnected(companyId, instanceId, businessPhone) {
  const r = await db.query(`
    UPDATE zapi_configurations
    SET integration_status = 'connected', connection_status = 'connected',
        business_phone = COALESCE($1, business_phone), last_connection_test = now(),
        updated_at = now()
    WHERE company_id = $2 AND (instance_id = $3 OR $3 IS NULL)
    RETURNING id, company_id, instance_id, integration_status
  `, [businessPhone, companyId, instanceId]);
  return r.rows[0];
}

/**
 * Busca company_id por instance_id (para webhook)
 */
async function getCompanyByInstanceId(instanceId) {
  const r = await db.query(
    'SELECT company_id FROM zapi_configurations WHERE instance_id = $1 AND active = true',
    [instanceId]
  );
  return r.rows[0]?.company_id || null;
}

module.exports = {
  PROVIDERS,
  getByCompany,
  upsertZApi,
  markConnected,
  getCompanyByInstanceId
};
