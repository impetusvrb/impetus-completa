/**
 * ROTAS Z-API - Conectar WhatsApp
 * POST connect, GET status, GET qr-code
 * Multi-tenant: cada empresa tem sua instância isolada
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const zapiService = require('../services/zapiService');
const whatsappService = require('../services/whatsappService');
const { PlanLimitError } = require('../services/planValidationService');
const db = require('../db');
const { logAction } = require('../middleware/audit');

/**
 * POST /api/zapi/connect
 * Conectar WhatsApp - valida limite, cria instância (ou usa manual), retorna QR
 */
router.post('/connect',
  requireAuth,
  requireHierarchy(2),
  async (req, res) => {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        return res.status(400).json({ ok: false, error: 'Usuário sem empresa vinculada' });
      }

      const companyRes = await db.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      const companyName = companyRes.rows[0]?.name || 'Empresa';

      const manual = req.body?.manual === true ? {
        instance_id: req.body.instance_id,
        instance_token: req.body.instance_token,
        client_token: req.body.client_token
      } : null;

      const result = await whatsappService.createInstance(companyId, companyName, manual);

      await logAction({
        companyId,
        userId: req.user.id,
        action: 'zapi_connect_started',
        entityType: 'zapi_config',
        description: 'Iniciada conexão WhatsApp via QR Code',
        severity: 'info'
      });

      res.json({
        ok: true,
        instance_id: result.instance_id,
        qr_code_base64: result.qr_code_base64,
        webhook_url: result.webhook_url,
        status: result.status
      });
    } catch (err) {
      if (err instanceof PlanLimitError) {
        return res.status(403).json({ ok: false, error: err.message });
      }
      console.error('[ZAPI_CONNECT_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: err.message || 'Erro ao conectar WhatsApp'
      });
    }
  }
);

/**
 * GET /api/zapi/status
 * Status da integração em tempo real
 */
router.get('/status',
  requireAuth,
  requireHierarchy(2),
  async (req, res) => {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        return res.status(400).json({ ok: false, error: 'Usuário sem empresa vinculada' });
      }

      const status = await zapiService.getConnectionStatus(companyId);
      res.json({ ok: true, ...status });
    } catch (err) {
      console.error('[ZAPI_STATUS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: err.message || 'Erro ao obter status'
      });
    }
  }
);

/**
 * GET /api/zapi/qr-code
 * Renovar QR Code (expira a cada ~20s)
 */
router.get('/qr-code',
  requireAuth,
  requireHierarchy(2),
  async (req, res) => {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        return res.status(400).json({ ok: false, error: 'Usuário sem empresa vinculada' });
      }

      const qrBase64 = await zapiService.getQRCode(companyId);
      res.json({
        ok: true,
        qr_code_base64: qrBase64
      });
    } catch (err) {
      console.error('[ZAPI_QR_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: err.message || 'Erro ao obter QR Code'
      });
    }
  }
);

module.exports = router;
