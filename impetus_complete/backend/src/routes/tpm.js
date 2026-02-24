/**
 * Rotas TPM - Formulário de Perdas e Manutenções
 */
const express = require('express');
const router = express.Router();
const tpmFormService = require('../services/tpmFormService');

router.get('/incidents', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const { from, to, limit } = req.query;
    const rows = await tpmFormService.listIncidents(companyId, { from, to, limit: parseInt(limit, 10) || 50 });
    res.json({ ok: true, incidents: rows });
  } catch (err) {
    console.error('[TPM_INCIDENTS]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/shift-totals', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const { from, to } = req.query;
    const rows = await tpmFormService.getShiftTotals(companyId, from, to);
    res.json({ ok: true, totals: rows });
  } catch (err) {
    console.error('[TPM_SHIFT_TOTALS]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
