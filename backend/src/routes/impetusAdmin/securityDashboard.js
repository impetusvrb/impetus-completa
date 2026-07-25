'use strict';

const express = require('express');
const { requireAdminAuth, requireAdminProfiles } = require('../../middleware/adminPortalAuth');
const dashboardSvc = require('../../services/adminPortalSecurityDashboardService');
const intelligenceSvc = require('../../services/adminPortalSecurityIntelligenceService');
const threatFlowSvc = require('../../services/threatFlowService');

const router = express.Router();

router.get(
  '/',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const force = req.query.refresh === '1';
      const data = await dashboardSvc.getSecurityDashboard(force);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard]', e);
      res.status(500).json({ ok: false, error: 'Erro ao carregar painel de segurança' });
    }
  }
);

router.get(
  '/explain',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const ip = String(req.query.ip || '').trim();
      if (!ip) return res.status(400).json({ ok: false, error: 'Parâmetro ip obrigatório' });
      const data = await dashboardSvc.explainBlockedIp(ip);
      if (!data.ok) return res.status(400).json(data);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/explain]', e);
      res.status(500).json({ ok: false, error: 'Erro ao explicar incidente' });
    }
  }
);

router.post(
  '/hardening/:id/approve',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const data = await dashboardSvc.approveHardening(req.params.id, req.adminUser?.email, reason);
      if (!data.ok) return res.status(400).json(data);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/hardening/approve]', e);
      res.status(500).json({ ok: false, error: 'Erro ao aprovar hardening' });
    }
  }
);

router.post(
  '/hardening/:id/reject',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const data = await dashboardSvc.rejectHardening(req.params.id, req.adminUser?.email, reason);
      if (!data.ok) return res.status(400).json(data);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/hardening/reject]', e);
      res.status(500).json({ ok: false, error: 'Erro ao rejeitar hardening' });
    }
  }
);

router.get(
  '/similar',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const type = String(req.query.type || '').trim();
      const ip = String(req.query.ip || '').trim();
      const data = await dashboardSvc.findSimilarAttacks(type, ip);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/similar]', e);
      res.status(500).json({ ok: false, error: 'Erro ao buscar ataques similares' });
    }
  }
);

router.post(
  '/simulation/run',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const data = await dashboardSvc.runSimulation({ force: true });
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/simulation]', e);
      res.status(500).json({ ok: false, error: 'Erro ao executar simulação SEC-19' });
    }
  }
);

// SEC-VISUAL-INTELLIGENCE-001 — Inteligência de Evidências por Origem
router.get(
  '/intelligence',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const countryCode = String(req.query.country_code || '').trim().toUpperCase();
      if (!countryCode) {
        return res.status(400).json({ ok: false, error: 'Parâmetro country_code obrigatório' });
      }
      const t0 = Date.now();
      const data = await intelligenceSvc.resolveCountryIntelligence(countryCode);
      res.set('X-Intelligence-Latency-Ms', String(Date.now() - t0));
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/intelligence]', e);
      res.status(500).json({ ok: false, error: 'Erro ao resolver inteligência de origem' });
    }
  }
);

// SEC-FLOW-002 — Radar Volumétrico Global / País / IP
router.get(
  '/threat-flow',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const VALID_SCOPES = new Set(['GLOBAL', 'ORIGIN', 'IP']);
      const VALID_WINDOWS = new Set(['1h', '6h', '24h']);

      const scope = String(req.query.scope || 'GLOBAL').toUpperCase();
      const windowParam = String(req.query.window || '24h');

      if (!VALID_SCOPES.has(scope)) {
        return res.status(400).json({ ok: false, error: 'scope inválido. Use: GLOBAL, ORIGIN, IP' });
      }
      if (!VALID_WINDOWS.has(windowParam)) {
        return res.status(400).json({ ok: false, error: 'window inválido. Use: 1h, 6h, 24h' });
      }

      // scopeId: country_code para ORIGIN, IP string para IP scope
      const rawScopeId = String(req.query.scopeId || '').trim();
      let scopeId = null;
      if (scope === 'ORIGIN') {
        if (!rawScopeId) return res.status(400).json({ ok: false, error: 'scopeId obrigatório para scope ORIGIN' });
        // country_code: 2 letras maiúsculas
        if (!/^[A-Z]{2}$/.test(rawScopeId.toUpperCase())) {
          return res.status(400).json({ ok: false, error: 'scopeId deve ser country_code de 2 letras para scope ORIGIN' });
        }
        scopeId = rawScopeId.toUpperCase();
      } else if (scope === 'IP') {
        if (!rawScopeId) return res.status(400).json({ ok: false, error: 'scopeId obrigatório para scope IP' });
        // Validação básica de IP (IPv4 ou IPv6 — não permitir valores arbitrários)
        if (!/^[0-9a-fA-F.:]{3,45}$/.test(rawScopeId)) {
          return res.status(400).json({ ok: false, error: 'scopeId deve ser um endereço IP válido para scope IP' });
        }
        scopeId = rawScopeId;
      }

      const data = await threatFlowSvc.getThreatFlow({ scope, scopeId, window: windowParam });
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/threat-flow]', e);
      res.status(500).json({ ok: false, error: 'Erro ao construir fluxo de ameaças' });
    }
  }
);

router.post(
  '/promotion/:id/approve',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const data = await dashboardSvc.approvePromotion(req.params.id, req.adminUser?.email, reason);
      if (!data.ok) return res.status(400).json(data);
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[impetusAdmin/securityDashboard/promotion]', e);
      res.status(500).json({ ok: false, error: 'Erro ao aprovar promoção assist' });
    }
  }
);

module.exports = router;
