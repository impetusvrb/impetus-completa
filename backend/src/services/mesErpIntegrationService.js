/**
 * IMPETUS - Camada de integração MES/ERP
 * Recebe dados via webhook/push; persiste em production_shift_data e mes_erp_sync_log
 * Não altera fluxos existentes
 */
const db = require('../db');
const crypto = require('crypto');
const axios = require('axios');

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
    `, [companyId, connectorId, errorMsg]).catch((err) => {
      console.warn('[mesErpIntegrationService][sync_log_insert]', err?.message ?? err);
    });
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
    } catch (err) {
      console.warn('[mesErpIntegrationService][auth_config_parse]', err?.message ?? err);
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

/**
 * Histórico de sincronização / testes do conector
 */
async function listSyncLogs(companyId, connectorId, limit = 50) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const r = await db.query(
    `
    SELECT id, sync_type, status, records_count, error_message, payload_summary, created_at
    FROM mes_erp_sync_log
    WHERE company_id = $1 AND connector_id = $2
    ORDER BY created_at DESC
    LIMIT $3
  `,
    [companyId, connectorId, lim]
  );
  return (r.rows || []).map((row) => {
    const ps =
      row.payload_summary && typeof row.payload_summary === 'object'
        ? row.payload_summary
        : {};
    return {
      id: row.id,
      sync_type: row.sync_type,
      status: row.status,
      records_count: row.records_count,
      error_message: row.error_message || null,
      payload_summary: row.payload_summary,
      created_at: row.created_at,
      duration_ms: ps.duration_ms != null ? ps.duration_ms : null
    };
  });
}

function assertSafeOutboundUrl(rawUrl) {
  let u;
  try {
    u = new URL(String(rawUrl).trim());
  } catch {
    const err = new Error('URL do endpoint inválida');
    err.status = 400;
    throw err;
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    const err = new Error('Apenas http/https são permitidos no teste');
    err.status = 400;
    throw err;
  }
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]') {
    const err = new Error('URL localhost não é permitida no teste a partir do servidor');
    err.status = 400;
    throw err;
  }
  return u.href;
}

function buildOutboundHeaders(authType, authConfig) {
  const cfg = authConfig && typeof authConfig === 'object' ? authConfig : {};
  const t = String(authType || 'api_key').toLowerCase();
  if (t === 'bearer') {
    const tok = cfg.token || cfg.access_token;
    if (tok) return { Authorization: `Bearer ${tok}` };
    return {};
  }
  if (t === 'basic') {
    const user = cfg.username || cfg.user || '';
    const pass = cfg.password || cfg.pass || '';
    if (user || pass) {
      const b64 = Buffer.from(`${user}:${pass}`).toString('base64');
      return { Authorization: `Basic ${b64}` };
    }
    return {};
  }
  if (t === 'oauth2') {
    const tok = cfg.access_token || cfg.token;
    if (tok) return { Authorization: `Bearer ${tok}` };
    return {};
  }
  const headerName = (cfg.header_name || 'X-API-Key').trim() || 'X-API-Key';
  const val = cfg.value ?? cfg.api_key ?? '';
  if (val) return { [headerName]: String(val) };
  return {};
}

/**
 * Testa conectividade outbound para endpoint_url (pull). Webhook-only sem URL → simula OK e regista log.
 */
async function testConnectorOutbound(companyId, connectorId) {
  const r = await db.query(
    `
    SELECT id, endpoint_url, auth_type, auth_config
    FROM integration_connectors
    WHERE id = $1 AND company_id = $2 AND connector_type = 'mes_erp'
  `,
    [connectorId, companyId]
  );
  if (!r.rows?.length) {
    const err = new Error('Conector não encontrado');
    err.status = 404;
    throw err;
  }
  const row = r.rows[0];
  let cfg = row.auth_config || {};
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = {};
    }
  }

  const endpoint = row.endpoint_url && String(row.endpoint_url).trim();
  if (!endpoint) {
    await db.query(
      `
      INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, records_count, payload_summary)
      VALUES ($1, $2, 'test', 'success', 0, $3::jsonb)
    `,
      [
        companyId,
        connectorId,
        JSON.stringify({
          mode: 'webhook_inbound_only',
          message: 'Sem URL externa; push via POST /api/integrations/mes-erp/push'
        })
      ]
    );
    return {
      ok: true,
      mode: 'webhook_only',
      message: 'Conector configurado para receber webhook (push). Não há URL externa para ping.'
    };
  }

  const url = assertSafeOutboundUrl(endpoint);
  const headers = buildOutboundHeaders(row.auth_type, cfg);
  const t0 = Date.now();
  let httpStatus = null;
  let errMsg = null;
  try {
    const resp = await axios.get(url, {
      headers: { Accept: 'application/json', ...headers },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true
    });
    httpStatus = resp.status;
    const okHttp = httpStatus >= 200 && httpStatus < 400;
    const duration_ms = Date.now() - t0;
    await db.query(
      `
      INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, records_count, payload_summary, error_message)
      VALUES ($1, $2, 'test', $3, 0, $4::jsonb, $5)
    `,
      [
        companyId,
        connectorId,
        okHttp ? 'success' : 'error',
        JSON.stringify({ http_status: httpStatus, duration_ms }),
        okHttp ? null : `HTTP ${httpStatus}`
      ]
    );
    if (!okHttp) {
      const err = new Error(`HTTP ${httpStatus} ao contactar o endpoint`);
      err.status = 502;
      err._mesErpTestLogged = true;
      throw err;
    }
    return { ok: true, http_status: httpStatus, duration_ms };
  } catch (e) {
    if (e && e._mesErpTestLogged) throw e;
    errMsg = e.response?.status ? `HTTP ${e.response.status}` : e.message || 'Falha na requisição';
    const duration_ms = Date.now() - t0;
    if (httpStatus == null && e.response?.status) httpStatus = e.response.status;
    await db.query(
      `
      INSERT INTO mes_erp_sync_log (company_id, connector_id, sync_type, status, records_count, payload_summary, error_message)
      VALUES ($1, $2, 'test', 'error', 0, $3::jsonb, $4)
    `,
      [
        companyId,
        connectorId,
        JSON.stringify({ http_status: httpStatus, duration_ms }),
        errMsg
      ]
    ).catch((logErr) => console.warn('[mesErpIntegrationService][test_log]', logErr?.message));
    if (!e.status) {
      const wrap = new Error(errMsg);
      wrap.status = e.response?.status >= 400 ? 502 : 500;
      throw wrap;
    }
    throw e;
  }
}

module.exports = {
  createConnector,
  listConnectors,
  processPush,
  assertMesErpPushAuthorized,
  listSyncLogs,
  testConnectorOutbound
};
