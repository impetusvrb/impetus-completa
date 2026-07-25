'use strict';

/**
 * REG-002 R2 — Industrial Operational Map Recovery
 * Remonta /api/dashboard/industrial/* → industrialOperationalMapService + machineBrain
 * Sem alterar lógica dos services existentes.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireTenantAdminRole } = require('../middleware/auth');
const db = require('../db');
const industrialMap = require('../services/industrialOperationalMapService');
const machineBrain = require('../services/machineBrainService');

async function getAutomationMode(companyId) {
  try {
    const cfg = await db.query(
      `SELECT automation_mode FROM industrial_automation_config WHERE company_id = $1`,
      [companyId]
    );
    return cfg.rows?.[0]?.automation_mode || 'monitor';
  } catch (err) {
    console.warn('[INDUSTRIAL_AUTOMATION_READ]', err?.message || err);
    return 'monitor';
  }
}

async function setAutomationMode(companyId, mode) {
  const allowed = ['monitor', 'assisted', 'automatic'];
  if (!allowed.includes(mode)) {
    const e = new Error('Modo inválido');
    e.status = 400;
    throw e;
  }
  try {
    const upd = await db.query(
      `UPDATE industrial_automation_config SET automation_mode = $2, updated_at = now() WHERE company_id = $1`,
      [companyId, mode]
    );
    if ((upd.rowCount || 0) === 0) {
      await db.query(
        `INSERT INTO industrial_automation_config (company_id, automation_mode, updated_at) VALUES ($1, $2, now())`,
        [companyId, mode]
      );
    }
  } catch (err) {
    // Tabela ausente — modo permanece em memória da resposta apenas
    console.warn('[INDUSTRIAL_AUTOMATION_WRITE]', err?.message || err);
  }
  return mode;
}

function flattenMachines(factoryMap) {
  const machines = [];
  for (const linha of factoryMap?.linhas || []) {
    for (const m of linha.maquinas || []) {
      machines.push({
        id: m.id,
        name: m.name || m.identifier,
        identifier: m.id?.toString?.() || m.name,
        line: linha.name || linha.id,
        status: m.status || (m.is_offline ? 'offline' : 'unknown'),
        is_offline: !!m.is_offline,
        temperature: m.temperature,
        vibration: m.vibration
      });
    }
  }
  for (const m of factoryMap?.equipamentos_soltos || []) {
    machines.push({
      id: m.id,
      name: m.name || m.identifier,
      identifier: m.id?.toString?.() || m.name,
      line: null,
      status: m.status || 'unknown',
      is_offline: !!m.is_offline
    });
  }
  return machines;
}

/** GET /industrial/status — payload esperado por IndustrialOperationsCenter */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const map = await industrialMap.getFactoryMap(companyId);
    const profiles = map.profiles || [];
    const events = map.recent_events || [];
    const machines = flattenMachines(map);
    res.json({
      ok: true,
      machines_count: machines.length,
      profiles,
      events,
      offline_equipment: map.offline_equipment || [],
      failure_predictions: map.failure_predictions || [],
      map
    });
  } catch (err) {
    console.error('[INDUSTRIAL_STATUS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar status industrial' });
  }
});

router.get('/events', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const map = await industrialMap.getFactoryMap(companyId);
    res.json({ ok: true, events: map.recent_events || [] });
  } catch (err) {
    console.error('[INDUSTRIAL_EVENTS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar eventos' });
  }
});

router.get('/profiles', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const profiles = await machineBrain.listProfiles(companyId);
    res.json({ ok: true, profiles: profiles || [] });
  } catch (err) {
    console.error('[INDUSTRIAL_PROFILES]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar perfis' });
  }
});

router.get('/automation', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const automation_mode = await getAutomationMode(companyId);
    const role = String(req.user?.role || '').toLowerCase();
    const can_configure = ['admin', 'internal_admin', 'ceo'].includes(role);
    res.json({ ok: true, automation_mode, can_configure });
  } catch (err) {
    console.error('[INDUSTRIAL_AUTOMATION_GET]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao ler modo de automação' });
  }
});

router.post('/automation', requireAuth, requireTenantAdminRole, express.json({ limit: '8kb' }), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const mode = req.body?.mode || req.body?.automation_mode;
    const automation_mode = await setAutomationMode(companyId, mode);
    res.json({ ok: true, automation_mode });
  } catch (err) {
    const status = err.status || 500;
    console.error('[INDUSTRIAL_AUTOMATION_SET]', err);
    res.status(status).json({ ok: false, error: err?.message || 'Erro ao alterar modo' });
  }
});

router.post('/command', requireAuth, requireTenantAdminRole, express.json({ limit: '32kb' }), async (req, res) => {
  try {
    let machineControl = null;
    try {
      machineControl = require('../services/machineControlService');
    } catch {
      return res.status(501).json({
        ok: false,
        error: 'machineControlService indisponível — comando industrial não ligado nesta remediação',
        code: 'REG002_COMMAND_SERVICE_MISSING'
      });
    }
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const { machine_identifier, command_type, command_value, machine_name } = req.body || {};
    if (!machine_identifier || !command_type) {
      return res.status(400).json({ ok: false, error: 'machine_identifier e command_type obrigatórios' });
    }
    const result = await machineControl.requestCommand(
      companyId,
      null,
      machine_identifier,
      machine_name || machine_identifier,
      '',
      command_type,
      command_value,
      req.user?.id || 'dashboard'
    );
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[INDUSTRIAL_COMMAND]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao enviar comando' });
  }
});

router.get('/machines', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const map = await industrialMap.getFactoryMap(companyId);
    const machines = flattenMachines(map);
    res.json({ ok: true, machines });
  } catch (err) {
    console.error('[INDUSTRIAL_MACHINES]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao listar máquinas' });
  }
});

/** CRUD machines — read-only recovery: list via getFactoryMap; mutations delegated if service supports */
router.post('/machines', requireAuth, requireTenantAdminRole, express.json({ limit: '32kb' }), async (req, res) => {
  res.status(501).json({
    ok: false,
    error: 'Cadastro de máquinas via API industrial não disponível — use Machine Brain / monitored points existentes',
    code: 'REG002_MACHINES_CREATE_NOT_WIRED'
  });
});

router.put('/machines/:id', requireAuth, requireTenantAdminRole, express.json({ limit: '32kb' }), async (req, res) => {
  res.status(501).json({
    ok: false,
    error: 'Atualização de máquinas via API industrial não disponível nesta remediação',
    code: 'REG002_MACHINES_UPDATE_NOT_WIRED'
  });
});

router.delete('/machines/:id', requireAuth, requireTenantAdminRole, async (req, res) => {
  res.status(501).json({
    ok: false,
    error: 'Remoção de máquinas via API industrial não disponível nesta remediação',
    code: 'REG002_MACHINES_DELETE_NOT_WIRED'
  });
});

module.exports = router;
