/**
 * SERVIÇO Z-API - Integração automática (Conectar WhatsApp)
 * Cria instância, obtém QR Code, configura webhook
 * Rate limit: 20 msg/min, delay 2-5s em respostas automáticas
 * Arquitetura modular para futura substituição por Meta Cloud API
 */

const db = require('../db');
const { createResilientClient } = require('../utils/httpClient');
const companyIntegration = require('../models/companyIntegration');

const ZAPI_BASE = process.env.ZAPI_DEFAULT_URL || 'https://api.z-api.io';
const ZAPI_INTEGRATOR_TOKEN = process.env.ZAPI_INTEGRATOR_TOKEN;
const BASE_URL = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
const WEBHOOK_PATH = '/api/webhook/zapi';

const http = createResilientClient();
const TIMEOUT = 15000;
const { checkRateLimit, getRandomDelayMs, RATE_LIMIT_MSGS_PER_MIN } = require('./zapiRateLimit');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Cria instância no Z-API (requer ZAPI_INTEGRATOR_TOKEN - conta parceira)
 */
async function createInstance(companyName) {
  if (!ZAPI_INTEGRATOR_TOKEN) {
    throw new Error('ZAPI_INTEGRATOR_TOKEN não configurada. Crie instância manualmente no painel Z-API.');
  }
  const webhookUrl = BASE_URL ? `${BASE_URL}${WEBHOOK_PATH}` : null;
  const payload = {
    name: `Impetus-${companyName?.substring(0, 30) || 'Empresa'}-${Date.now()}`,
    isDevice: false,
    businessDevice: true
  };
  if (webhookUrl) {
    payload.receivedCallbackUrl = webhookUrl;
    payload.connectedCallbackUrl = webhookUrl;
    payload.deliveryCallbackUrl = webhookUrl;
    payload.disconnectedCallbackUrl = webhookUrl;
    payload.messageStatusCallbackUrl = webhookUrl;
  }
  const res = await http.post(
    `${ZAPI_BASE}/instances/integrator/on-demand`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_INTEGRATOR_TOKEN
      },
      timeout: TIMEOUT
    }
  );
  return {
    instanceId: res.data?.id,
    token: res.data?.token,
    due: res.data?.due
  };
}

/**
 * Configura webhooks em instância existente
 */
async function configureWebhook(instanceId, token, clientToken) {
  const webhookUrl = BASE_URL ? `${BASE_URL}${WEBHOOK_PATH}` : null;
  if (!webhookUrl) return;
  const t = clientToken || token;
  await http.put(
    `${ZAPI_BASE}/instances/${instanceId}/token/${token}/update-every-webhooks`,
    { value: webhookUrl, notifySentByMe: true },
    {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': t
      },
      timeout: TIMEOUT
    }
  );
}

/**
 * Obtém QR Code em base64 da instância
 */
async function getQRCodeImage(instanceId, token, clientToken) {
  const t = clientToken || token;
  const res = await http.get(
    `${ZAPI_BASE}/instances/${instanceId}/token/${token}/qr-code/image`,
    {
      headers: { 'Client-Token': t },
      timeout: TIMEOUT
    }
  );
  return res.data?.value || res.data?.base64 || res.data;
}

/**
 * Verifica status de conexão da instância
 */
async function getInstanceStatus(instanceId, token, clientToken) {
  const t = clientToken || token;
  const res = await http.get(
    `${ZAPI_BASE}/instances/${instanceId}/token/${token}/status`,
    {
      headers: { 'Client-Token': t },
      timeout: TIMEOUT
    }
  );
  return {
    connected: res.data?.connected === true,
    phone: res.data?.phone,
    ...res.data
  };
}

/**
 * Fluxo completo: Conectar WhatsApp
 * Cria instância (se integrator) ou usa dados manuais, salva no banco, retorna QR
 */
async function connectWhatsApp(companyId, companyName, manualCredentials = null) {
  let instanceId, token, clientToken;

  if (manualCredentials?.instance_id && manualCredentials?.instance_token) {
    instanceId = manualCredentials.instance_id;
    token = manualCredentials.instance_token;
    clientToken = manualCredentials.client_token || token;
  } else if (ZAPI_INTEGRATOR_TOKEN) {
    const created = await createInstance(companyName);
    instanceId = created.instanceId;
    token = created.token;
    clientToken = ZAPI_INTEGRATOR_TOKEN;
  } else {
    throw new Error('Configure ZAPI_INTEGRATOR_TOKEN ou informe instance_id e instance_token.');
  }

  const webhookUrl = BASE_URL ? `${BASE_URL}${WEBHOOK_PATH}` : null;
  await companyIntegration.upsertZApi(companyId, {
    instance_id: instanceId,
    instance_token: token,
    client_token: clientToken,
    api_url: ZAPI_BASE,
    webhook_url: webhookUrl,
    business_phone: null
  });

  await configureWebhook(instanceId, token, clientToken);

  let qrBase64 = null;
  try {
    qrBase64 = await getQRCodeImage(instanceId, token, clientToken);
  } catch (e) {
    console.warn('[ZAPI_SERVICE] QR não disponível:', e.message);
  }

  return {
    instance_id: instanceId,
    qr_code_base64: qrBase64,
    webhook_url: webhookUrl,
    status: 'pending',
    _token: token,
    _clientToken: clientToken
  };
}

/**
 * Obtém status atual da integração da empresa
 */
async function getConnectionStatus(companyId) {
  const config = await companyIntegration.getByCompany(companyId);
  if (!config) return { status: 'not_configured', connected: false };

  const decrypted = await require('./zapi').getZApiConfig(companyId).catch(() => null);
  if (!decrypted) return {
    status: config.integration_status || config.connection_status || 'pending',
    connected: config.connection_status === 'connected'
  };

  try {
    const live = await getInstanceStatus(
      config.instance_id,
      decrypted.instance_token,
      decrypted.client_token
    );
    if (live.connected && config.integration_status !== 'connected') {
      await companyIntegration.markConnected(companyId, config.instance_id, live.phone);
    }
    return {
      status: live.connected ? 'connected' : 'pending',
      connected: live.connected,
      phone: live.phone
    };
  } catch (e) {
    return {
      status: config.integration_status || 'pending',
      connected: config.connection_status === 'connected'
    };
  }
}

/**
 * Obtém QR Code atual (para renovar quando expira)
 */
async function getQRCode(companyId) {
  const config = await companyIntegration.getByCompany(companyId);
  if (!config) return null;

  const decrypted = await require('./zapi').getZApiConfig(companyId);
  return getQRCodeImage(
    config.instance_id,
    decrypted.instance_token,
    decrypted.client_token
  );
}

/**
 * Wrapper para envio com rate limit e delay (respostas automáticas)
 */
async function sendWithRateLimit(companyId, phone, message, options = {}) {
  const config = await companyIntegration.getByCompany(companyId);
  if (!config) throw new Error('WhatsApp não configurado');

  if (!checkRateLimit(config.instance_id)) {
    throw new Error('Limite de mensagens excedido. Aguarde 1 minuto.');
  }

  if (options.applyDelay) {
    await sleep(getRandomDelayMs());
  }

  return require('./zapi').sendTextMessage(companyId, phone, message);
}

module.exports = {
  connectWhatsApp,
  getConnectionStatus,
  getQRCode,
  getInstanceStatus,
  sendWithRateLimit,
  RATE_LIMIT_MSGS_PER_MIN
};
