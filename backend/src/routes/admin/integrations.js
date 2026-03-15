/**
 * IMPETUS - Módulo Integrações e Conectividades
 * Acesso: Administrador do Software (role admin ou administrador_software)
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');
const { requireSoftwareAdmin } = require('../../middleware/softwareAdminAccess');
const service = require('../../services/integrationConnectionsService');
const gateway = require('../../services/integrationGatewayService');

const protect = [requireAuth, requireCompanyActive, requireSoftwareAdmin];

router.get('/', ...protect, async (req, res) => {
  try {
    const list = await service.list(req.user.company_id);
    res.json({ ok: true, integrations: list });
  } catch (err) {
    if (err.message?.includes('does not exist')) return res.json({ ok: true, integrations: [] });
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/options', ...protect, (req, res) => {
  res.json({
    ok: true,
    types: service.INTEGRATION_TYPES,
    frequencies: service.FREQUENCY_OPTIONS,
    dataTypes: service.DATA_TYPES,
    destinations: service.DESTINATION_MODULES
  });
});

router.get('/:id', ...protect, async (req, res) => {
  try {
    const item = await service.getById(req.params.id, req.user.company_id);
    if (!item) return res.status(404).json({ ok: false, error: 'Não encontrado' });
    res.json({ ok: true, integration: item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', ...protect, async (req, res) => {
  try {
    const item = await service.create(req.user.company_id, req.body);
    res.status(201).json({ ok: true, integration: item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/:id', ...protect, async (req, res) => {
  try {
    const item = await service.update(req.params.id, req.user.company_id, req.body);
    if (!item) return res.status(404).json({ ok: false, error: 'Não encontrado' });
    res.json({ ok: true, integration: item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', ...protect, async (req, res) => {
  try {
    await service.remove(req.params.id, req.user.company_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/test', ...protect, async (req, res) => {
  try {
    const result = await service.testConnection(req.params.id, req.user.company_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
