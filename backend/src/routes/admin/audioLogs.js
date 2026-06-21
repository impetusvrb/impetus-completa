'use strict';

/**
 * Logs de Áudio (admin) — listagem sensível para auditoria.
 * Acesso restrito a CEO / diretoria / admin. Sempre scoped por company_id do token.
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../../middleware/auth');
const audioLogs = require('../../services/audioLogsService');

router.get(
  '/',
  requireAuth,
  requireRole('ceo', 'admin', 'diretor'),
  async (req, res) => {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        return res.status(403).json({ ok: false, error: 'Tenant obrigatório' });
      }
      const { limit, offset, source, search } = req.query || {};
      const result = await audioLogs.listForAdmin(companyId, { limit, offset, source, search });
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || 'Erro ao listar logs de áudio' });
    }
  }
);

module.exports = router;
