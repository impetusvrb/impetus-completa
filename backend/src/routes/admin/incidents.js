'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireCompanyId } = require('../../middleware/auth');
const aiIncidentService = require('../../services/aiIncidentService');
const unifiedMessagingService = require('../../services/unifiedMessagingService');

const adminCompany = [requireAuth, requireRole('admin'), requireCompanyId];

router.get('/stats', ...adminCompany, async (req, res) => {
  try {
    const days = req.query.days;
    const data = await aiIncidentService.statsWeekly({
      companyId: req.user.company_id,
      days
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ADMIN_INCIDENTS_STATS]', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao obter estatísticas.' });
  }
});

router.get('/', ...adminCompany, async (req, res) => {
  try {
    const items = await aiIncidentService.listForCompany(req.user.company_id, req.query.limit);
    res.json({ success: true, data: { items, count: items.length } });
  } catch (err) {
    console.error('[ADMIN_INCIDENTS_LIST]', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao listar incidentes.' });
  }
});

router.get('/:id', ...adminCompany, async (req, res) => {
  try {
    const row = await aiIncidentService.getByIdForCompany(req.params.id, req.user.company_id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Incidente não encontrado.' });
    }
    const trace_snapshot = await aiIncidentService.fetchTraceSnapshot(
      row.trace_id,
      req.user.company_id
    );
    res.json({ success: true, data: { incident: row, trace_snapshot } });
  } catch (err) {
    console.error('[ADMIN_INCIDENTS_GET]', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao obter incidente.' });
  }
});

router.patch('/:id', ...adminCompany, async (req, res) => {
  try {
    const { status, resolution_note } = req.body || {};
    const result = await aiIncidentService.updateByCompanyAdmin(
      req.params.id,
      req.user.company_id,
      { status, resolution_note },
      req.user.id
    );
    if (!result) {
      return res.status(404).json({ success: false, error: 'Incidente não encontrado.' });
    }
    const { previous, current } = result;
    const wasOpen = !['RESOLVED', 'FALSE_POSITIVE'].includes(previous.status);
    const isClosed = ['RESOLVED', 'FALSE_POSITIVE'].includes(current.status);
    if (wasOpen && isClosed && previous.user_id) {
      const msg =
        current.status === 'FALSE_POSITIVE'
          ? 'O relatório de incidente da IA foi analisado pela sua organização e classificado como falso positivo. Obrigado pelo contexto.'
          : 'O incidente de qualidade da IA que reportou foi marcado como resolvido pela sua organização. Obrigado pelo feedback; o modelo e as fontes de dados foram revistos.';
      await unifiedMessagingService.sendToUser(
        req.user.company_id,
        previous.user_id,
        msg,
        {}
      );
    }
    res.json({ success: true, data: { incident: current } });
  } catch (err) {
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('[ADMIN_INCIDENTS_PATCH]', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao atualizar incidente.' });
  }
});

module.exports = router;
