/**
 * IMPETUS - Camada de integração MES/ERP
 * Recebe dados via webhook/push; persiste em production_shift_data e mes_erp_sync_log
 * Não altera fluxos existentes
 */
const db = require('../db');
const crypto = require('crypto');

/**
 * Registra um conector MES/ERP
 */
async function createConnector(companyId, { name, endpoint_url, auth_type, auth_config, mapping_config }) {
  const authCfg = { ...(auth_config || {}) };
  if (!authCfg.webhook_secret && !authCfg.api_key) {
    authCfg.webhook_secret = crypto.randomBytes(32).toString('hex');
  }
  const r = await db.query(`
    INSERT INTO integration_connectors (company_id, connector_type, name, endpoint_url, auth_type, auth_config, mapping_config)
    VALUES ($1, 'mes_erp', $2, $3, $4, $5, $6)
    RETURNING id, name, connector_type, enabled, created_at, auth_config
  `, [
    companyId,
    name || 'MES/ERP',
    endpoint_url || null,
    auth_type || 'api_key',
    JSON.stringify(authCfg),
    JSON.stringify(mapping_config || {})
  ]);
  return r.rows[0];
}

/**
 * Lista conectores da empresa
 */
async function listConnectors(companyId) {
  const r = await db.query(`
    SELECT id, name, connector_type, endpoint_url, enabled, created_at
    FROM integration_connectors WHERE company_id = $1 AND connector_type = 'mes_erp'
  `, [companyId]);
  return r.rows || [];
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

function safeEqualToken(a, b) {
  const x = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const y = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(x, y);
}

/**
 * Push MES/ERP: obriga conector + segredo em auth_config (webhook_secret, api_key ou push_token).
 * Token: header X-Integration-Token ou body.token
 */
async function assertMesErpPushAuthorized(companyId, connectorId, presentedToken) {
  if (!companyId) {
    const err = new Error('company_id obrigatório');
    err.status = 400;
    throw err;
  }
  if (!connectorId) {
    const err = new Error('connector_id obrigatório no push MES/ERP');
    err.status = 400;
    throw err;
  }
  const token = String(presentedToken || '').trim();
  if (!token) {
    const err = new Error('X-Integration-Token ou token no body obrigatório');
    err.status = 401;
    throw err;
  }

  const r = await db.query(
    `SELECT id, auth_config FROM integration_connectors
     WHERE id = $1 AND company_id = $2 AND enabled = true AND connector_type = 'mes_erp'`,
    [connectorId, companyId]
  );
  if (!r.rows?.length) {
    const err = new Error('Conector inválido ou desativado');
    err.status = 403;
    throw err;
  }
  let cfg = r.rows[0].auth_config || {};
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = {};
    }
  }
  const expected =
    cfg.webhook_secret ||
    cfg.api_key ||
    cfg.push_token ||
    cfg.token ||
    null;
  if (!expected) {
    const err = new Error(
      'Configure auth_config.webhook_secret ou api_key no conector MES/ERP antes de receber push.'
    );
    err.status = 403;
    throw err;
  }
  if (!safeEqualToken(token, expected)) {
    const err = new Error('Token de integração inválido');
    err.status = 403;
    throw err;
  }
  return r.rows[0].id;
}

module.exports = {
  createConnector,
  listConnectors,
  processPush,
  assertMesErpPushAuthorized
};
