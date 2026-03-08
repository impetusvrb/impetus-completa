/**
 * Serviço de Criação de Instâncias WhatsApp
 * Orquestra: validação de plano -> Z-API -> persistência
 * Separação de responsabilidades para SaaS escalável
 */

const db = require('../db');
const planValidationService = require('./planValidationService');
const zapiService = require('./zapiService');
const { encrypt } = require('../utils/crypto');

const WEBHOOK_PATH = '/api/webhook/zapi';
const BASE_URL = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');

function maybeEncrypt(val) {
  if (!val) return val;
  try {
    return process.env.ENCRYPTION_KEY ? encrypt(String(val)) : val;
  } catch {
    return val;
  }
}

/**
 * Cria nova instância WhatsApp para a empresa
 * 1. Valida limite (OBRIGATÓRIO no backend antes de chamar Z-API)
 * 2. Cria na Z-API via zapiService
 * 3. Salva em whatsapp_instances
 */
async function createInstance(companyId, companyName, manualCredentials = null) {
  await planValidationService.validateCanCreateInstance(companyId);

  const result = await zapiService.connectWhatsApp(companyId, companyName, manualCredentials);
  const { instance_id, status, _token: token, _clientToken: clientToken } = result;
  const webhookUrl = result.webhook_url || (BASE_URL ? `${BASE_URL}${WEBHOOK_PATH}` : null);

  await db.query(`
    INSERT INTO whatsapp_instances (company_id, instance_id, token, webhook_url, status, instance_token, client_token, api_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    companyId,
    instance_id,
    maybeEncrypt(token || ''),
    webhookUrl,
    status || 'pending',
    maybeEncrypt(token || ''),
    maybeEncrypt(clientToken || token || ''),
    process.env.ZAPI_DEFAULT_URL || 'https://api.z-api.io'
  ]);

  const { _token, _clientToken, ...safeResult } = result;
  return safeResult;
}

/**
 * Retorna quantidade de instâncias e limite da empresa
 */
async function getInstanceStats(companyId) {
  const limit = await planValidationService.getLimitForCompany(companyId);
  const count = await planValidationService.countInstancesForCompany(companyId);
  return { limit, count, canAdd: count < limit };
}

module.exports = {
  createInstance,
  getInstanceStats
};
