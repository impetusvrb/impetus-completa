/**
 * IMPETUS - Camada de integração MES/ERP
 * Recebe dados via webhook/push; persiste em production_shift_data e mes_erp_sync_log
 * Não altera fluxos existentes
 */
const db = require('../db');
const crypto = require('crypto');

function maskAuthConfig(authType, authConfig) {
  const cfg = authConfig && typeof authConfig === 'object' ? authConfig : {};
  if (!authType || authType === 'none') return {};
  if (authType === 'api_key') return { header_name: cfg.header_name || 'X-API-Key' };
  if (authType === 'bearer') return {};
  if (authType === 'basic') return { username: cfg.username ? '***' : undefined };
  if (authType === 'oauth2') return { token_url: cfg.token_url, client_id: cfg.client_id ? '***' : undefined };
  return {};
}

/**
 * Registra um conector MES/ERP
 */
async function createConnector(companyId, {
  name,
  endpoint_url,
  auth_type,
  auth_config,
  mapping_config,
  receive_mode,
  schedule_cron,
  field_map
}) {
  const r = await db.query(`
    INSERT INTO integration_connectors (
      company_id, connector_type, name, endpoint_url,
      auth_type, auth_config, mapping_config,
      receive_mode, schedule_cron, field_map
    )
    VALUES ($1, 'mes_erp', $2, $3, $4, $5, $6, COALESCE($7,'webhook'), $8, COALESCE($9,'{}'::jsonb))
    RETURNING id, name, connector_type, endpoint_url, enabled, receive_mode, schedule_cron, last_sync_at, last_status, created_at
  `, [
    companyId,
    name || 'MES/ERP',
    endpoint_url || null,
    auth_type || 'none',
    JSON.stringify(auth_config || {}),
    JSON.stringify(mapping_config || {}),
    receive_mode || 'webhook',
    schedule_cron || null,
    JSON.stringify(field_map || {})
  ]);
  return r.rows[0];
}

async function updateConnector(companyId, connectorId, patch) {
  const {
    name,
    endpoint_url,
    auth_type,
    auth_config,
    mapping_config,
    receive_mode,
    schedule_cron,
    field_map,
    enabled
  } = patch || {};

  const r = await db.query(`
    UPDATE integration_connectors SET
      name = COALESCE($3, name),
      endpoint_url = COALESCE($4, endpoint_url),
      auth_type = COALESCE($5, auth_type),
      auth_config = COALESCE($6::jsonb, auth_config),
      mapping_config = COALESCE($7::jsonb, mapping_config),
      receive_mode = COALESCE($8, receive_mode),
      schedule_cron = COALESCE($9, schedule_cron),
      field_map = COALESCE($10::jsonb, field_map),
      enabled = COALESCE($11, enabled),
      updated_at = now()
    WHERE id = $1 AND company_id = $2 AND connector_type = 'mes_erp'
    RETURNING id, name, connector_type, endpoint_url, enabled, receive_mode, schedule_cron, last_sync_at, last_status, created_at, updated_at
  `, [
    connectorId,
    companyId,
    name ?? null,
    endpoint_url ?? null,
    auth_type ?? null,
    auth_config !== undefined ? JSON.stringify(auth_config) : null,
    mapping_config !== undefined ? JSON.stringify(mapping_config) : null,
    receive_mode ?? null,
    schedule_cron ?? null,
    field_map !== undefined ? JSON.stringify(field_map) : null,
    enabled ?? null
  ]);
  return r.rows[0] || null;
}

/**
 * Lista conectores da empresa
 */
async function listConnectors(companyId) {
  const r = await db.query(`
    SELECT id, name, connector_type, endpoint_url, enabled, created_at,
           receive_mode, schedule_cron, last_sync_at, last_status, last_error,
           auth_type, auth_config, field_map
    FROM integration_connectors WHERE company_id = $1 AND connector_type = 'mes_erp'
  `, [companyId]);
  return (r.rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    connector_type: row.connector_type,
    endpoint_url: row.endpoint_url,
    enabled: row.enabled,
    created_at: row.created_at,
    receive_mode: row.receive_mode,
    schedule_cron: row.schedule_cron,
    last_sync_at: row.last_sync_at,
    last_status: row.last_status,
    last_error: row.last_error,
    auth_type: row.auth_type,
    auth_config: maskAuthConfig(row.auth_type, row.auth_config),
    field_map: row.field_map || {}
  }));
}

/**
 * Processa payload push de MES/ERP (webhook)
 * Payload esperado: { production: [{ line_identifier, line_name, shift_date, shift_code, produced_qty, target_qty, ... }], ... }
 */
async function processPush(companyId, connectorId, payload) {
  let recordsCount = 0;
  let errorMsg = null;

  try {
    const production = payload?.production || payload?.productions || payload?.shifts || [];
    const mapping = payload?.mapping || {};

    for (const row of production) {
      const lineId = row.line_identifier || row.line_id || row.linha;
      const lineName = row.line_name || row.line || row.linha_nome;
      const shiftDate = row.shift_date ? new Date(row.shift_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const shiftCode = row.shift_code || row.turno || row.shift || 'A';
      const produced = parseFloat(row.produced_qty ?? row.produced ?? row.quantidade ?? 0);
      const target = parseFloat(row.target_qty ?? row.target ?? row.meta ?? 0);
      const good = parseFloat(row.good_qty ?? row.good ?? produced);
      const scrap = parseFloat(row.scrap_qty ?? row.scrap ?? 0);

      await db.query(`
        INSERT INTO production_shift_data (company_id, line_identifier, line_name, shift_date, shift_code, produced_qty, target_qty, good_qty, scrap_qty, efficiency_pct, source, source_ref)
        VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, 'mes_erp', $11)
        ON CONFLICT (company_id, line_identifier, shift_date, shift_code) DO UPDATE SET
          produced_qty = EXCLUDED.produced_qty, target_qty = EXCLUDED.target_qty,
          good_qty = EXCLUDED.good_qty, scrap_qty = EXCLUDED.scrap_qty,
          efficiency_pct = CASE WHEN EXCLUDED.target_qty > 0 THEN (EXCLUDED.produced_qty / EXCLUDED.target_qty * 100) ELSE NULL END,
          updated_at = now()
      `, [
        companyId,
        lineId,
        lineName,
        shiftDate,
        shiftCode,
        produced,
        target,
        good,
        scrap,
        target > 0 ? (produced / target * 100) : null,
        connectorId
      ]);
      recordsCount++;
    }

    await db.query(`
      INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, records_count, payload_summary)
      VALUES ($1, $2, 'push', 'success', $3, $4)
    `, [companyId, connectorId, recordsCount, JSON.stringify({ keys: Object.keys(payload || {}) })]);

    return { ok: true, recordsCount };
  } catch (err) {
    errorMsg = err?.message || 'Erro ao processar push';
    await db.query(`
      INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, error_message)
      VALUES ($1, $2, 'push', 'error', $3)
    `, [companyId, connectorId, errorMsg]).catch(() => {});
    throw err;
  }
}

/**
 * Valida token de integração (por connector)
 */
function validateToken(connectorId, token) {
  // Implementação simplificada: token pode ser o connector_id ou hash no auth_config
  return Boolean(connectorId && token);
}

module.exports = {
  createConnector,
  updateConnector,
  listConnectors,
  processPush
};
