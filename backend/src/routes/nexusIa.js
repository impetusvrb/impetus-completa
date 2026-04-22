'use strict';

/**
 * Nexus IA — transparência de fornecedores (governança; aditivo ao billing).
 * GET /api/nexus-ia/providers-transparency
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiProviderService = require('../services/aiProviderService');

function requireCompanyAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito ao administrador da empresa.',
      code: 'NEXUS_TRANSPARENCY_ADMIN_ONLY'
    });
  }
  next();
}

router.get('/providers-transparency', requireAuth, requireCompanyAdmin, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    }
    const data = await aiProviderService.buildTransparencyPayloadForCompany(companyId);
    res.json(data);
  } catch (err) {
    console.error('[NEXUS_IA_TRANSPARENCY]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar transparência.' });
  }
});

module.exports = router;
