'use strict';

/**
 * GÊMEO DIGITAL APLICADO — Rotas HTTP
 * Base: /api/manutencao-ia/digital-twin
 *
 * Módulo desacoplado — consome dados do ManuIA, não altera rotas existentes.
 * Guard: mesmo manuiaGuard (auth + empresa ativa + perfil manutenção)
 */

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { apiByUserLimiter } = require('../middleware/globalRateLimit');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { resolveDashboardProfile } = require('../services/dashboardProfileResolver');

const MAINTENANCE_PROFILES = new Set([
  'technician_maintenance',
  'supervisor_maintenance',
  'coordinator_maintenance',
  'manager_maintenance'
]);

function requireMaintenanceProfile(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });
  const profile = resolveDashboardProfile(user);
  const profileStr = String(profile || '');
  const byCode = MAINTENANCE_PROFILES.has(profile);
  const byName = profileStr.includes('maintenance') || profileStr.includes('manutencao');
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  const fa = (user.functional_area || '').toLowerCase();
  const byOperationalLead = ['gerente', 'supervisor', 'coordenador'].includes(role) && h <= 3;
  const byFunctionalArea = ['maintenance', 'manutencao', 'manutenc'].some((x) => fa.includes(x));
  if (!byCode && !byName && !byOperationalLead && !byFunctionalArea) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito à equipe de manutenção',
      code: 'MAINTENANCE_PROFILE_REQUIRED'
    });
  }
  req.manuiaProfile = profile;
  next();
}

const guard = [requireAuth, requireCompanyActive, requireMaintenanceProfile];

// ─────────────────────────────────────────────────────────────
// Dashboard KPIs
// ─────────────────────────────────────────────────────────────

router.get('/dashboard', guard, async (req, res) => {
  try {
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const memoryService = require('../services/digitalTwinMemoryService');
    const [kpis, memoryStats, topFailures] = await Promise.all([
      diagnosticService.getDashboardKpis(req.user.company_id),
      memoryService.getStats(req.user.company_id),
      memoryService.topFailures(req.user.company_id, 5)
    ]);
    res.json({ ok: true, kpis, memoryStats, topFailures });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_DASHBOARD]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Executar diagnóstico completo
// ─────────────────────────────────────────────────────────────

router.post('/diagnose', guard, apiByUserLimiter, async (req, res) => {
  try {
    const { machine_id, trigger_source, trigger_data, image_base64 } = req.body || {};
    if (!machine_id) {
      return res.status(400).json({ ok: false, error: 'machine_id obrigatório' });
    }
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const result = await diagnosticService.runFullDiagnostic(
      req.user.company_id,
      req.user.id,
      machine_id,
      {
        triggerSource: trigger_source || 'manual',
        triggerData: trigger_data || {},
        imageBase64: image_base64 || null
      }
    );
    if (!result.ok) {
      return res.status(result.code === 'GEMINI_UNAVAILABLE' ? 503 : 404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[DIGITAL_TWIN_DIAGNOSE]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro no diagnóstico' });
  }
});

// ─────────────────────────────────────────────────────────────
// Listar diagnósticos
// ─────────────────────────────────────────────────────────────

router.get('/diagnostics', guard, async (req, res) => {
  try {
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const { machine_id, status, limit, offset } = req.query;
    const diagnostics = await diagnosticService.listDiagnostics(req.user.company_id, {
      machineId: machine_id || null,
      status: status || null,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0
    });
    res.json({ ok: true, diagnostics });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_LIST]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Diagnóstico por ID (detalhado com assets visuais)
// ─────────────────────────────────────────────────────────────

router.get('/diagnostics/:id', guard, async (req, res) => {
  try {
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const diag = await diagnosticService.getDiagnosticById(req.user.company_id, req.params.id);
    if (!diag) return res.status(404).json({ ok: false, error: 'Diagnóstico não encontrado' });
    res.json({ ok: true, diagnostic: diag });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_GET]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Resolver diagnóstico → registra na memória industrial
// ─────────────────────────────────────────────────────────────

router.post('/diagnostics/:id/resolve', guard, apiByUserLimiter, async (req, res) => {
  try {
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const result = await diagnosticService.resolveDiagnostic(
      req.user.company_id,
      req.params.id,
      req.body || {}
    );
    res.json(result);
  } catch (err) {
    console.warn('[DIGITAL_TWIN_RESOLVE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Análise de tendência standalone
// ─────────────────────────────────────────────────────────────

router.post('/trend-analysis', guard, apiByUserLimiter, async (req, res) => {
  try {
    const { machine_id } = req.body || {};
    if (!machine_id) {
      return res.status(400).json({ ok: false, error: 'machine_id obrigatório' });
    }
    const diagnosticService = require('../services/digitalTwinDiagnosticService');
    const geminiEngine = require('../services/geminiIndustrialEngine');
    const ctx = await diagnosticService.gatherMachineContext(req.user.company_id, machine_id);
    if (!ctx) return res.status(404).json({ ok: false, error: 'Máquina não encontrada' });
    const trend = await geminiEngine.analyzeTrend(ctx.sensorData, ctx.machine);
    res.json({ ok: true, trend, machine: ctx.machine });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_TREND]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Diagnóstico por imagem standalone
// ─────────────────────────────────────────────────────────────

router.post('/image-diagnostic', guard, apiByUserLimiter, async (req, res) => {
  try {
    const { image_base64, machine_id } = req.body || {};
    if (!image_base64) {
      return res.status(400).json({ ok: false, error: 'image_base64 obrigatório' });
    }
    const geminiEngine = require('../services/geminiIndustrialEngine');
    if (!geminiEngine.isAvailable()) {
      return res.status(503).json({ ok: false, error: 'Gemini indisponível', code: 'GEMINI_UNAVAILABLE' });
    }
    let machineCtx = {};
    if (machine_id) {
      const diagnosticService = require('../services/digitalTwinDiagnosticService');
      const ctx = await diagnosticService.gatherMachineContext(req.user.company_id, machine_id);
      if (ctx) machineCtx = ctx.machine;
    }
    const result = await geminiEngine.analyzeImageDiagnostic(image_base64, machineCtx);
    res.json({ ok: true, diagnosis: result });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_IMAGE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Memória industrial — busca e stats
// ─────────────────────────────────────────────────────────────

router.get('/memory', guard, async (req, res) => {
  try {
    const memoryService = require('../services/digitalTwinMemoryService');
    const { machine_id, failure_type, component, limit } = req.query;
    const entries = await memoryService.search(req.user.company_id, {
      machineId: machine_id || null,
      failureType: failure_type || null,
      component: component || null,
      limit: Math.min(parseInt(limit) || 10, 50)
    });
    res.json({ ok: true, entries });
  } catch (err) {
    console.warn('[DIGITAL_TWIN_MEMORY]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/memory/stats', guard, async (req, res) => {
  try {
    const memoryService = require('../services/digitalTwinMemoryService');
    const stats = await memoryService.getStats(req.user.company_id);
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  const geminiEngine = require('../services/geminiIndustrialEngine');
  res.json({
    ok: true,
    module: 'digital_twin_applied',
    gemini_available: geminiEngine.isAvailable(),
    version: '1.0.0'
  });
});

module.exports = router;
