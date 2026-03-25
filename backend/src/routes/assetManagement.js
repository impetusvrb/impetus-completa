'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const assetManagementService = require('../services/assetManagementService');

const router = express.Router();
router.use(requireAuth);

function cid(req) {
  return req.user?.company_id;
}

router.get('/twins', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.json({ twins: [] });
    const twins = await assetManagementService.getTwins(companyId);
    res.json({ twins });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.get('/twins/:id', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.status(404).json({ error: 'Nao encontrado' });
    const twins = await assetManagementService.getTwins(companyId);
    const twin = twins.find((t) => t.id === req.params.id);
    if (!twin) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(twin);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.post('/twins/:id/simulate', async (req, res) => {
  res.json({ ok: true, message: 'Simulacao registrada.' });
});

router.get('/stock', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.json({ items: [] });
    const items = await assetManagementService.getStock(companyId);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.patch('/stock/:id', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.status(400).json({ ok: false });
    const rp = req.body?.reorder_point ?? req.body?.reorderPoint;
    if (rp != null) {
      await assetManagementService.updateReorderPoint(companyId, req.params.id, Number(rp));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/stock/purchase-order', async (req, res) => {
  res.json({ ok: true, id: 'PO-' + Date.now() });
});

router.get('/orders', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.json({ orders: [] });
    const orders = await assetManagementService.getOrders(companyId);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.post('/orders/:id/approve', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.status(400).json({ ok: false });
    await assetManagementService.approveOrder(companyId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/orders/:id/reassign', async (req, res) => {
  try {
    const companyId = cid(req);
    if (!companyId) return res.status(400).json({ ok: false });
    await assetManagementService.reassignOrder(companyId, req.params.id, req.body?.team_id || req.body?.teamId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const companyId = cid(req);
    const uid = req.user?.id;
    if (!companyId) return res.status(400).json({ ok: false });
    const id = await assetManagementService.createOrder(companyId, uid, req.body || {});
    res.json({ ok: true, id: id ? String(id) : undefined });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
