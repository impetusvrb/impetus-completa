/**
 * Rotas TPM - Formulário de Perdas e Manutenções
 */
const express = require('express');
const router = express.Router();
const tpmFormService = require('../services/tpmFormService');

const jsonBody = express.json({ limit: '128kb' });

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

/**
 * Novo registro TPM pelo Pró-Ação (web) — alimenta perdas antes/durante/depois e totais por turno.
 */
router.post('/incidents', jsonBody, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const b = req.body || {};
    if (!b.incident_date || String(b.incident_date).trim() === '') {
      return res.status(400).json({ ok: false, error: 'Data da ocorrência (incident_date) é obrigatória' });
    }
    const eq = (b.equipment_code || '').trim();
    const comp = (b.component_name || '').trim();
    if (!eq && !comp) {
      return res.status(400).json({
        ok: false,
        error: 'Informe equipamento (equipment_code) e/ou componente (component_name)'
      });
    }
    const op = (b.operator_name || '').trim();
    if (!op) {
      return res.status(400).json({ ok: false, error: 'Nome do operador (operator_name) é obrigatório' });
    }
    const incident = await tpmFormService.createIncidentFromWeb(companyId, b, userId);
    res.status(201).json({ ok: true, incident });
  } catch (err) {
    console.error('[TPM_INCIDENT_CREATE]', err);
    res.status(400).json({ ok: false, error: err.message || 'Erro ao registrar incidente' });
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
