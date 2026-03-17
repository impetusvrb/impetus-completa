/**
 * IMPETUS - Rotas de Integração (MES/ERP, Edge, Digital Twin)
 * Endpoints para sistemas externos e webhooks
 */
const router = require('express').Router();
const db = require('../db');
const mesErp = require('../services/mesErpIntegrationService');
const edgeIngest = require('../services/edgeIngestService');
const productionRealtime = require('../services/productionRealtimeService');
const digitalTwin = require('../services/digitalTwinService');
const integrationLogs = require('../services/integrationLogsService');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { requireIndustrialAdmin } = require('../middleware/industrialIntegrationAccess');

// ---- MES/ERP ----

/**
 * POST /api/integrations/mes-erp/push
 * Webhook para MES/ERP enviar dados de produção
 * Auth: X-Integration-Token + company_id no body, ou connector_id
 */
router.post('/mes-erp/push', async (req, res) => {
  try {
    const { company_id, connector_id, token } = req.body;
    const apiToken = req.headers['x-integration-token'] || token;
    const companyId = company_id || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'company_id obrigatório' });
    }

    // Validação simplificada: token pode ser validado contra connector
    const connectorId = connector_id || req.body.connectorId;
    if (connectorId) {
      const r = await db.query(
        'SELECT id FROM integration_connectors WHERE id = $1 AND company_id = $2 AND enabled = true',
        [connectorId, companyId]
      );
      if (!r.rows?.length) {
        return res.status(403).json({ ok: false, error: 'Conector inválido ou desativado' });
      }
    }

    const result = await mesErp.processPush(companyId, connectorId || null, req.body);
    res.json({ ok: true, recordsCount: result.recordsCount });
  } catch (err) {
    console.warn('[MES_ERP_PUSH]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao processar push' });
  }
});

router.get('/mes-erp/connectors', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const list = await mesErp.listConnectors(req.user.company_id);
    res.json({ ok: true, connectors: list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/mes-erp/connectors', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const conn = await mesErp.createConnector(req.user.company_id, req.body);
    res.json({ ok: true, connector: conn });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.put('/mes-erp/connectors/:id', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const updated = await mesErp.updateConnector(req.user.company_id, req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: 'Conector não encontrado' });
    res.json({ ok: true, connector: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/mes-erp/connectors/:id/logs', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const logs = await integrationLogs.listLogs(req.user.company_id, req.params.id, parseInt(req.query.limit, 10) || 50);
    res.json({ ok: true, logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// Teste de conexão (com retry/backoff)
router.post('/mes-erp/connectors/:id/test', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const connectorId = req.params.id;
    const r = await db.query(
      `SELECT id, endpoint_url, auth_type, auth_config
       FROM integration_connectors
       WHERE id = $1 AND company_id = $2 AND connector_type = 'mes_erp'`,
      [connectorId, companyId]
    );
    if (!r.rows?.length) return res.status(404).json({ ok: false, error: 'Conector não encontrado' });
    const c = r.rows[0];
    if (!c.endpoint_url) return res.status(400).json({ ok: false, error: 'endpoint_url não configurado' });

    const start = Date.now();
    const authType = c.auth_type || 'none';
    const cfg = c.auth_config && typeof c.auth_config === 'object' ? c.auth_config : {};
    const headers = {};
    if (authType === 'api_key') {
      const h = (cfg.header_name || 'X-API-Key').trim();
      if (cfg.value) headers[h] = String(cfg.value);
    } else if (authType === 'bearer') {
      if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
    } else if (authType === 'basic') {
      const u = cfg.username || '';
      const p = cfg.password || '';
      const b64 = Buffer.from(`${u}:${p}`).toString('base64');
      headers.Authorization = `Basic ${b64}`;
    }

    const delays = [1000, 5000, 30000];
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await axios.get(c.endpoint_url, { headers, timeout: 15000, validateStatus: () => true });
        const ms = Date.now() - start;
        const ok = resp.status >= 200 && resp.status < 400;
        await integrationLogs.writeLog(companyId, connectorId, {
          event_type: 'test',
          status: ok ? 'success' : 'error',
          duration_ms: ms,
          response_body: String(resp.status),
          error_message: ok ? null : `HTTP ${resp.status}`
        });
        await db.query(
          `UPDATE integration_connectors SET last_sync_at = now(), last_status = $3, last_error = $4 WHERE id = $1 AND company_id = $2`,
          [connectorId, companyId, ok ? 'success' : 'error', ok ? null : `HTTP ${resp.status}`]
        );
        if (ok) return res.json({ ok: true, status: resp.status, duration_ms: ms });
        lastErr = new Error(`HTTP ${resp.status}`);
      } catch (e) {
        lastErr = e;
      }
      if (i < delays.length) await new Promise((r2) => setTimeout(r2, delays[i]));
    }

    const ms = Date.now() - start;
    await integrationLogs.writeLog(companyId, connectorId, {
      event_type: 'test',
      status: 'error',
      duration_ms: ms,
      error_message: lastErr?.message || 'Falha no teste'
    });
    await db.query(
      `UPDATE integration_connectors SET last_sync_at = now(), last_status = 'error', last_error = $3 WHERE id = $1 AND company_id = $2`,
      [connectorId, companyId, lastErr?.message || 'Falha no teste']
    );
    res.status(400).json({ ok: false, error: lastErr?.message || 'Falha no teste', duration_ms: ms });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Produção em tempo real (registro manual) ----

router.post('/production/shift', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const result = await productionRealtime.recordShift(
      req.user.company_id,
      { ...req.body, source: 'manual', source_ref: req.user.id }
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/production/shift', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { date, line_identifier } = req.query;
    const data = await productionRealtime.getShiftData(req.user.company_id, { date, line_identifier });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Edge ----

/**
 * POST /api/integrations/edge/ingest
 * Edge agent envia leituras em batch
 * Auth: edge_id + company_id + token no body
 */
router.post('/edge/ingest', async (req, res) => {
  try {
    const result = await edgeIngest.ingest(req.body);
    res.json({ ok: true, processed: result.processed });
  } catch (err) {
    console.warn('[EDGE_INGEST]', err?.message);
    res.status(400).json({ ok: false, error: err?.message || 'Erro ao processar ingest' });
  }
});

/**
 * POST /api/integrations/edge/register
 * Registra edge agent e retorna token (admin)
 */
router.post('/edge/register', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const { edge_id, name } = req.body;
    if (!edge_id || typeof edge_id !== 'string' || !edge_id.trim()) {
      return res.status(400).json({ ok: false, error: 'edge_id obrigatório' });
    }
    const result = await edgeIngest.registerEdgeAgent(req.user.company_id, { edge_id: edge_id.trim(), name });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/edge/agents', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, edge_id, name, enabled, last_seen_at, status, created_at
       FROM edge_agents WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.user.company_id]
    );
    res.json({ ok: true, agents: r.rows || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/edge/agents/:id/revoke', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const r = await db.query(
      `UPDATE edge_agents SET enabled = false, revoked_at = now(), updated_at = now()
       WHERE id = $1 AND company_id = $2 RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!r.rows?.length) return res.status(404).json({ ok: false, error: 'Edge agent não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Digital Twin ----

/**
 * GET /api/integrations/digital-twin/state
 * Estado do Digital Twin (mapa + layout + estados cache)
 */
router.get('/digital-twin/state', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const state = await digitalTwin.getTwinState(req.user.company_id);
    res.json({ ok: true, ...state });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, linhas: [], profiles: [], layout: {}, cached_states: {} });
    }
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * PUT /api/integrations/digital-twin/layout
 * Salva layout da planta (admin)
 */
router.put('/digital-twin/layout', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    await digitalTwin.saveLayout(req.user.company_id, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
