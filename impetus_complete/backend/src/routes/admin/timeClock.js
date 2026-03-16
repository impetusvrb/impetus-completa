/**
 * ADMIN - Integração de Sistema de Ponto
 * Configuração apenas para administradores (hierarchy <= 1)
 * Cadastrar sistemas, conectar API, credenciais, frequência de sincronização
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
let timeClock;
try { timeClock = require('../../services/timeClockIntegrationService'); } catch (_) { timeClock = null; }
const { z } = require('zod');

const adminMw = [requireAuth, requireHierarchy(1)];

const upsertSchema = z.object({
  system_code: z.string().min(1).max(64),
  api_url: z.union([z.string().url(), z.literal('')]).optional(),
  api_key: z.string().optional(),
  credentials: z.record(z.any()).optional(),
  sync_interval_minutes: z.number().int().min(5).max(1440).optional(),
  sync_cron: z.string().max(128).optional(),
  enabled: z.boolean().optional()
});

/**
 * GET /api/admin/time-clock/systems
 * Lista sistemas de ponto disponíveis (catálogo)
 */
router.get('/systems', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const systems = await timeClock.listSystems();
    res.json({ ok: true, systems });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_SYSTEMS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar sistemas' });
  }
});

/**
 * GET /api/admin/time-clock/integration
 * Obtém integração da empresa (sem credenciais)
 */
router.get('/integration', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const integration = await timeClock.getIntegration(companyId);
    res.json({ ok: true, integration });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_INTEGRATION]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar integração' });
  }
});

/**
 * PUT /api/admin/time-clock/integration
 * Cria/atualiza integração (api_url, api_key, sync, etc.)
 */
router.put('/integration', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.errors?.[0]?.message || 'Dados inválidos' });
    }
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const integration = await timeClock.upsertIntegration(companyId, parsed.data);
    res.json({ ok: true, integration });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_UPSERT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao salvar integração' });
  }
});

/**
 * POST /api/admin/time-clock/validate
 * Valida conexão com sistema externo
 */
router.post('/validate', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const result = await timeClock.validateConnection(companyId);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_VALIDATE]', err);
    res.status(500).json({ ok: false, error: 'Erro ao validar conexão' });
  }
});

/**
 * POST /api/admin/time-clock/import
 * Importa registros de ponto manualmente (ou via integração push)
 * Body: { records: [{ user_id?, external_employee_id?, employee_name, record_date, clock_in, clock_out, ... }] }
 */
router.post('/import', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ ok: false, error: 'Envie um array "records" com os registros' });
    }
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const result = await timeClock.importRecords(companyId, records);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_IMPORT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro na importação' });
  }
});

/**
 * POST /api/admin/time-clock/sync
 * Executa sincronização manual (últimos 7 dias)
 */
router.post('/sync', ...adminMw, async (req, res) => {
  if (!timeClock) return res.status(503).json({ ok: false, error: 'Módulo de ponto desativado' });
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const result = await timeClock.runSync(companyId);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ADMIN_TIME_CLOCK_SYNC]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro na sincronização' });
  }
});

module.exports = router;
