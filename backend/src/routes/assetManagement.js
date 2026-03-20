'use strict';

/**
 * IMPETUS - Gestão de Ativos - API (mock)
 * Montar: app.use('/api/asset-management', assetManagementRouter);
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getMockTwins() {
  return [
    { id: 'DT-001', machineId: 'M1', name: 'Motor WEG W22 15cv', type: 'motor', department: 'Manutenção',
      sensors: { temperature: 72, vibration: 4.2, efficiency: 88, rpm: 1750 }, status: 'warn',
      prediction: { failureProbability: 45, estimatedFailureIn: '18h', faultParts: ['Rolamento 6205'], aiMessage: 'Vibração acima do normal.' },
      history: [68, 69, 70, 71, 72, 72, 71, 70, 71, 72, 73, 72], operatingHours: 12450, lastMaintenance: '2026-02-15' },
    { id: 'DT-002', machineId: 'M2', name: 'Bomba Grundfos CM5', type: 'bomba', department: 'Manutenção',
      sensors: { temperature: 45, vibration: 1.8, efficiency: 95, pressure: 3.2 }, status: 'ok',
      prediction: { failureProbability: 8, estimatedFailureIn: 'OK', faultParts: [], aiMessage: 'Operando normalmente.' },
      history: [44, 45, 45, 46, 45, 45, 44, 45, 45, 45, 46, 45], operatingHours: 8200, lastMaintenance: '2026-01-20' },
    { id: 'DT-003', machineId: 'M3', name: 'Compressor Atlas Copco', type: 'compressor', department: 'Manutenção',
      sensors: { temperature: 85, vibration: 6.1, efficiency: 72 }, status: 'critical',
      prediction: { failureProbability: 78, estimatedFailureIn: '6h', faultParts: ['Válvula de alívio'], aiMessage: 'Temperatura elevada.' },
      history: [78, 80, 82, 84, 85], operatingHours: 15200, lastMaintenance: '2025-12-10' }
  ];
}

function getMockStock() {
  return [
    { id: 'S1', code: 'ROL-6205', name: 'Rolamento 6205-2RS', qty: 4, reorderPoint: 6, max: 20, leadTime: 7, consumo90dias: 12 },
    { id: 'S2', code: 'COR-A52', name: 'Correia trapezoidal A52', qty: 2, reorderPoint: 3, max: 15, leadTime: 5, consumo90dias: 6 },
    { id: 'S3', code: 'SEL-M01', name: 'Selo mecânico', qty: 8, reorderPoint: 4, max: 12, leadTime: 10, consumo90dias: 5 },
    { id: 'S4', code: 'FIL-O01', name: 'Filtro de óleo', qty: 1, reorderPoint: 5, max: 10, leadTime: 3, consumo90dias: 8 }
  ];
}

function getMockOrders() {
  return [
    { id: 'OS-001', machineId: 'M3', machineName: 'Compressor Atlas Copco', priority: 'P1', status: 'pending_approval', type: 'Corretiva Urgente', createdBy: 'IA', createdAt: new Date().toISOString() },
    { id: 'OS-002', machineId: 'M1', machineName: 'Motor WEG W22', priority: 'P3', status: 'open', type: 'Preventiva', teamId: 'T1', createdAt: new Date().toISOString() },
    { id: 'OS-003', machineId: 'M2', machineName: 'Bomba Grundfos', priority: 'P4', status: 'open', type: 'Rotina', teamId: 'T2', createdAt: new Date().toISOString() }
  ];
}

router.get('/twins', async (req, res) => {
  try {
    const { department_id } = req.query;
    const twins = getMockTwins();
    res.json({ twins });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.get('/twins/:id', async (req, res) => {
  const twin = getMockTwins().find((t) => t.id === req.params.id);
  if (!twin) return res.status(404).json({ error: 'Não encontrado' });
  res.json(twin);
});

router.post('/twins/:id/simulate', async (req, res) => {
  res.json({ ok: true, message: 'Simulação registrada' });
});

router.get('/stock', async (req, res) => {
  try {
    res.json({ items: getMockStock() });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.patch('/stock/:id', async (req, res) => {
  res.json({ ok: true });
});

router.post('/stock/purchase-order', async (req, res) => {
  res.json({ ok: true, id: 'PO-' + Date.now() });
});

router.get('/orders', async (req, res) => {
  try {
    res.json({ orders: getMockOrders() });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erro' });
  }
});

router.post('/orders/:id/approve', async (req, res) => {
  res.json({ ok: true });
});

router.post('/orders/:id/reassign', async (req, res) => {
  res.json({ ok: true });
});

router.post('/orders', async (req, res) => {
  res.json({ ok: true, id: 'OS-' + Date.now() });
});

module.exports = router;
