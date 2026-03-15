/**
 * IMPETUS - Gateway de Integração
 * Recebe dados externos, valida, padroniza e encaminha para Data Lake / módulos
 */
const db = require('../db');

async function ingestFromWebhook(webhookToken, payload) {
  const wh = await db.query(`
    SELECT iw.integration_id, si.company_id, si.destination_module, si.data_types
    FROM integration_webhooks iw
    JOIN system_integrations si ON si.id = iw.integration_id AND si.enabled = true
    WHERE iw.webhook_token = $1
  `, [webhookToken]);
  if (!wh.rows[0]) throw new Error('Webhook inválido ou integração desativada');

  const { integration_id, company_id, destination_module, data_types } = wh.rows[0];
  const normalized = normalizePayload(payload);
  const dataType = normalized.data_type || (Array.isArray(data_types) && data_types[0]) || 'custom';

  await db.query(`
    INSERT INTO data_lake_entries (company_id, integration_id, data_type, source_module, payload)
    VALUES ($1, $2, $3, $4, $5)
  `, [company_id, integration_id, dataType, destination_module || 'gateway', JSON.stringify(normalized)]);

  await db.query(`
    UPDATE system_integrations SET last_communication_at = now(), last_status = 'ok', last_error = null
    WHERE id = $1
  `, [integration_id]);

  await db.query(`
    INSERT INTO integration_communication_log (integration_id, status, records_count) VALUES ($1, 'ok', 1)
  `, [integration_id]);

  return { ok: true, stored: true };
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') return { raw: payload };
  const out = { ...payload };
  if (payload.temperature != null) out.temperature = Number(payload.temperature);
  if (payload.vibration != null) out.vibration = Number(payload.vibration);
  if (payload.produced_qty != null) out.produced_qty = Number(payload.produced_qty);
  if (payload.timestamp) out.received_at = payload.timestamp;
  return out;
}

module.exports = { ingestFromWebhook, normalizePayload };
