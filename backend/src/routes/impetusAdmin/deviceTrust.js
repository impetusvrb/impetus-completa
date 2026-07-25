'use strict';

const express = require('express');
const { z } = require('zod');
const { requireAdminAuth, requireAdminProfiles } = require('../../middleware/adminPortalAuth');
const deviceTrust = require('../../services/adminPortalDeviceTrustService');
const { logAdminAction } = require('../../services/adminPortalLogService');

const router = express.Router();

router.get('/status', requireAdminAuth, async (req, res) => {
  try {
    const ip = deviceTrust.clientIp(req);
    const fp = deviceTrust.hashDevice({
      device_id: req.query.device_id,
      user_agent: req.headers['user-agent']
    });
    const ipOk = await deviceTrust.isIpAuthorized(req.adminUser.id, ip);
    const devices = await deviceTrust.listDevices(req.adminUser.id);
    const approved = devices.filter((d) => d.status === 'approved' && d.device_fingerprint_hash === fp);
    res.json({
      ok: true,
      enabled: deviceTrust.isEnabled(),
      mode: process.env.IMPETUS_ADMIN_DEVICE_TRUST_MODE || 'enforce',
      current_ip: ip,
      ip_authorized: ipOk,
      device_authorized: approved.length > 0,
      fingerprint: fp.slice(0, 12)
    });
  } catch (e) {
    console.error('[deviceTrust/status]', e);
    res.status(500).json({ ok: false, error: 'Erro ao consultar dispositivo' });
  }
});

router.get('/devices', requireAdminAuth, async (req, res) => {
  try {
    const all = req.adminUser.perfil === 'super_admin' && req.query.all === '1';
    const rows = await deviceTrust.listDevices(all ? null : req.adminUser.id);
    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error('[deviceTrust/devices]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar dispositivos' });
  }
});

router.get('/ips', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const rows = await deviceTrust.listIps();
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Erro ao listar IPs' });
  }
});

router.post(
  '/devices/:id/approve',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const row = await deviceTrust.approveDevice(req.params.id, req.adminUser.id);
      if (!row) return res.status(404).json({ ok: false, error: 'Dispositivo não encontrado' });
      await logAdminAction({
        adminUserId: req.adminUser.id,
        acao: 'dispositivo_aprovado',
        entidade: 'admin_trusted_devices',
        entidade_id: row.id,
        ip: deviceTrust.clientIp(req),
        detalhes: { admin_user_id: row.admin_user_id, label: row.device_label }
      });
      res.json({ ok: true, data: row });
    } catch (e) {
      console.error('[deviceTrust/approve]', e);
      res.status(500).json({ ok: false, error: 'Erro ao aprovar dispositivo' });
    }
  }
);

router.post(
  '/devices/:id/revoke',
  requireAdminAuth,
  requireAdminProfiles('super_admin'),
  async (req, res) => {
    try {
      const row = await deviceTrust.revokeDevice(req.params.id);
      if (!row) return res.status(404).json({ ok: false, error: 'Dispositivo não encontrado' });
      await logAdminAction({
        adminUserId: req.adminUser.id,
        acao: 'dispositivo_revogado',
        entidade: 'admin_trusted_devices',
        entidade_id: row.id,
        ip: deviceTrust.clientIp(req)
      });
      res.json({ ok: true, data: row });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Erro ao revogar dispositivo' });
    }
  }
);

router.post('/ips', requireAdminAuth, requireAdminProfiles('super_admin'), async (req, res) => {
  try {
    const body = z
      .object({
        ip_pattern: z.string().min(3),
        label: z.string().optional(),
        admin_user_id: z.string().uuid().optional().nullable()
      })
      .parse(req.body);
    const row = await deviceTrust.addTrustedIp({
      adminUserId: body.admin_user_id || null,
      ipPattern: body.ip_pattern.trim(),
      label: body.label,
      approverId: req.adminUser.id
    });
    res.json({ ok: true, data: row });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos' });
    }
    res.status(500).json({ ok: false, error: 'Erro ao adicionar IP' });
  }
});

module.exports = router;
