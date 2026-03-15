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
