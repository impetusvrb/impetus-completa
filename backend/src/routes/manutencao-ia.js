/**
 * IMPETUS - ManuIA - Rotas do módulo de manutenção assistida por IA
 * Acesso exclusivo para perfis de manutenção (technician, supervisor, coordinator, manager)
 * Rota base: /api/manutencao-ia
 */
const router = require('express').Router();
const db = require('../db');
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

/** Verifica se o usuário possui perfil de manutenção (acesso ao ManuIA) */
function requireMaintenanceProfile(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }
  const profile = resolveDashboardProfile(user);
  const profileStr = String(profile || '');
  const byCode = MAINTENANCE_PROFILES.has(profile);
  const byName = profileStr.includes('maintenance') || profileStr.includes('manutencao');
  if (!byCode && !byName) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito à equipe de manutenção',
      code: 'MAINTENANCE_PROFILE_REQUIRED'
    });
  }
  req.manuiaProfile = profile;
  next();
}

/** Middleware chain para ManuIA: auth + company + perfil manutenção */
const manuiaGuard = [requireAuth, requireCompanyActive, requireMaintenanceProfile];

// ---- Máquinas ----

/**
 * GET /api/manutencao-ia/machines
 * Lista máquinas cadastradas no ManuIA (por empresa)
 */
router.get('/machines', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.json({ ok: true, machines: [] });
    }
    const r = await db.query(
      `SELECT id, code, name, sector, line_name, monitored_point_id, position_x, position_y, position_z, metadata, active, created_at
       FROM manuia_machines WHERE company_id = $1 AND active = true ORDER BY name`,
      [companyId]
    );
    res.json({ ok: true, machines: r.rows || [] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, machines: [] });
    }
    console.warn('[MANUIA_MACHINES]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao listar máquinas' });
  }
});

/**
 * GET /api/manutencao-ia/machines/:id
 * Detalhes de uma máquina
 */
router.get('/machines/:id', manuiaGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const r = await db.query(
      `SELECT id, code, name, sector, line_name, monitored_point_id, position_x, position_y, position_z, metadata, active, created_at, updated_at
       FROM manuia_machines WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (!r.rows?.length) {
      return res.status(404).json({ ok: false, error: 'Máquina não encontrada' });
    }
    res.json({ ok: true, machine: r.rows[0] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.status(404).json({ ok: false, error: 'Máquina não encontrada' });
    }
    console.warn('[MANUIA_MACHINE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * GET /api/manutencao-ia/machines/:id/diagnostic
 * Diagnóstico da máquina (estado, sensores, últimos eventos)
 */
router.get('/machines/:id/diagnostic', manuiaGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const machineR = await db.query(
      `SELECT id, code, name, sector, line_name FROM manuia_machines WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (!machineR.rows?.length) {
      return res.status(404).json({ ok: false, error: 'Máquina não encontrada' });
    }
    const machine = machineR.rows[0];

    let sensors = [];
    try {
      const sensorR = await db.query(
        `SELECT id, sensor_code, sensor_name, sensor_type, unit, last_value, last_read_at
         FROM manuia_sensors WHERE machine_id = $1 AND company_id = $2 AND active = true`,
        [id, companyId]
      );
      sensors = sensorR.rows || [];
    } catch (err) {
      console.warn(
        '[manutencao-ia][sensors_list]',
        err && err.message ? err.message : err
      );
    }

    let events = [];
    try {
      const evR = await db.query(
        `SELECT id, event_type, severity, description, created_at
         FROM manuia_emergency_events
         WHERE machine_id = $1 AND company_id = $2 AND resolved_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
        [id, companyId]
      );
      events = evR.rows || [];
    } catch (err) {
      console.warn(
        '[manutencao-ia][emergency_events]',
        err && err.message ? err.message : err
      );
    }

    res.json({
      ok: true,
      machine,
      sensors,
      recent_events: events,
      summary: { status: 'operational', message: 'Nenhum alerta ativo' }
    });
  } catch (err) {
    console.warn('[MANUIA_DIAGNOSTIC]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Sensores ----

/**
 * GET /api/manutencao-ia/sensors
 * Lista sensores (opcional: ?machine_id=uuid)
 */
router.get('/sensors', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { machine_id } = req.query;

    let q = `SELECT s.id, s.machine_id, s.sensor_code, s.sensor_name, s.sensor_type, s.unit, s.last_value, s.last_read_at, m.name as machine_name
             FROM manuia_sensors s
             JOIN manuia_machines m ON m.id = s.machine_id AND m.company_id = $1
             WHERE s.company_id = $1 AND s.active = true`;
    const params = [companyId];
    if (machine_id) {
      params.push(machine_id);
      q += ` AND s.machine_id = $${params.length}`;
    }
    q += ' ORDER BY m.name, s.sensor_code';

    const r = await db.query(q, params);
    res.json({ ok: true, sensors: r.rows || [] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, sensors: [] });
    }
    console.warn('[MANUIA_SENSORS]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Sessões ----

/**
 * GET /api/manutencao-ia/sessions
 * Lista sessões do usuário ou da empresa (conforme perfil)
 */
router.get('/sessions', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const profile = req.manuiaProfile;

    let q, params;
    if (profile === 'technician_maintenance') {
      q = `SELECT id, machine_id, work_order_id, session_type, started_at, ended_at, summary
           FROM manuia_sessions WHERE company_id = $1 AND user_id = $2 ORDER BY started_at DESC LIMIT 50`;
      params = [companyId, userId];
    } else {
      q = `SELECT id, user_id, machine_id, work_order_id, session_type, started_at, ended_at, summary
           FROM manuia_sessions WHERE company_id = $1 ORDER BY started_at DESC LIMIT 50`;
      params = [companyId];
    }

    const r = await db.query(q, params);
    res.json({ ok: true, sessions: r.rows || [] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, sessions: [] });
    }
    console.warn('[MANUIA_SESSIONS]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/manutencao-ia/sessions
 * Inicia nova sessão de manutenção assistida
 */
router.post('/sessions', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { machine_id, work_order_id, session_type = 'diagnostic' } = req.body || {};

    const r = await db.query(
      `INSERT INTO manuia_sessions (company_id, user_id, machine_id, work_order_id, session_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, machine_id, work_order_id, session_type, started_at`,
      [companyId, userId, machine_id || null, work_order_id || null, session_type]
    );
    res.status(201).json({ ok: true, session: r.rows[0] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.status(503).json({ ok: false, error: 'Módulo ManuIA ainda não inicializado. Execute as migrations.' });
    }
    console.warn('[MANUIA_SESSIONS_POST]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Eventos de emergência ----

/**
 * GET /api/manutencao-ia/emergency-events
 * Lista eventos de emergência não resolvidos
 */
router.get('/emergency-events', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const r = await db.query(
      `SELECT e.id, e.machine_id, e.sensor_id, e.event_type, e.severity, e.description, e.created_at, m.name as machine_name
       FROM manuia_emergency_events e
       LEFT JOIN manuia_machines m ON m.id = e.machine_id
       WHERE e.company_id = $1 AND e.resolved_at IS NULL ORDER BY e.created_at DESC`,
      [companyId]
    );
    res.json({ ok: true, events: r.rows || [] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, events: [] });
    }
    console.warn('[MANUIA_EMERGENCY]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ---- Pesquisa de equipamento por texto (IA) ----

const equipmentResearchService = require('../services/equipmentResearchService');
const manuiaLiveAssistanceService = require('../services/manuiaLiveAssistanceService');

function manuiaPublicBaseUrl(req) {
  const env = process.env.PUBLIC_APP_URL;
  if (env && /^https?:\/\//i.test(String(env).trim())) return String(env).trim().replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return host ? `${proto}://${host}` : '';
}

/**
 * POST /api/manutencao-ia/research-equipment
 * Pesquisa equipamento na internet via IA e retorna dados estruturados para renderização 3D
 * Body: { query: string, session_id?: uuid }
 * Prioriza Biblioteca Técnica Inteligente (modelo GLB/GLTF) antes do catálogo procedural.
 */
router.post('/research-equipment', manuiaGuard, apiByUserLimiter, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { query, session_id } = req.body || {};

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Informe ao menos 3 caracteres do equipamento' });
    }

    const result = await equipmentResearchService.researchEquipment(
      query.trim(),
      companyId,
      userId,
      session_id || null,
      manuiaPublicBaseUrl(req)
    );
    res.json({ ok: true, research: result });
  } catch (err) {
    console.warn('[MANUIA_RESEARCH]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro na pesquisa' });
  }
});

/**
 * GET /api/manutencao-ia/research-equipment/recent
 * Últimas pesquisas do usuário (sugestões no campo de busca)
 */
router.get('/research-equipment/recent', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const items = await equipmentResearchService.getRecentSearches(companyId, userId, limit);
    res.json({ ok: true, items });
  } catch (err) {
    console.warn('[MANUIA_RECENT]', err?.message);
    res.json({ ok: true, items: [] });
  }
});

/**
 * POST /api/manutencao-ia/live-assistance/analyze-frame
 * Body: { imageBase64, machineId?, sessionId? } — visão + dossiê técnico (Gemini + pesquisa interna)
 */
router.post('/live-assistance/analyze-frame', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { imageBase64, machineId, sessionId } = req.body || {};
    const b64 = String(imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    if (!b64 || b64.length < 80) {
      return res.status(400).json({ ok: false, error: 'Imagem inválida ou muito pequena' });
    }
    const vision = await manuiaLiveAssistanceService.identifyPartFromImageWithGemini(b64);
    if (!vision.ok) {
      return res.status(503).json({ ok: false, error: vision.error || 'Análise indisponível' });
    }
    const dossier = await manuiaLiveAssistanceService.buildTechnicalDossier({
      companyId,
      userId,
      sessionId: sessionId || null,
      publicBaseUrl: manuiaPublicBaseUrl(req),
      machineId: machineId || null,
      detection: vision.detection
    });
    res.json({
      ok: true,
      detection: vision.detection,
      dossier
    });
  } catch (err) {
    console.warn('[MANUIA_LIVE_ANALYZE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro na análise ao vivo' });
  }
});

/**
 * POST /api/manutencao-ia/live-assistance/chat
 * Body: { messages: [{role, content}], dossier? }
 */
router.post('/live-assistance/chat', manuiaGuard, apiByUserLimiter, async (req, res) => {
  try {
    const { messages, dossier } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: 'messages obrigatório' });
    }
    const billing = { companyId: req.user.company_id, userId: req.user.id };
    const reply = await manuiaLiveAssistanceService.generateCopilotReply({
      messages: messages.slice(-12),
      dossier: dossier || {},
      billing
    });
    res.json({ ok: true, reply });
  } catch (err) {
    console.warn('[MANUIA_LIVE_CHAT]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro no copiloto' });
  }
});

/**
 * POST /api/manutencao-ia/live-assistance/save-session
 * Body: { sessionId, dossier?, summaryText? }
 */
router.post('/live-assistance/save-session', manuiaGuard, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { sessionId, dossier, summaryText } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'sessionId obrigatório' });
    }
    const out = await manuiaLiveAssistanceService.saveDiagnosisSession({
      sessionId,
      companyId,
      userId,
      dossier: dossier || {},
      summaryText: summaryText || null
    });
    res.json({ ok: !!out.ok, ...out });
  } catch (err) {
    console.warn('[MANUIA_LIVE_SAVE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/manutencao-ia/conclude-session
 * Conclui sessão: gera OS automática e opcionalmente cadastra equipamento
 * Body: { equipment_name, equipment_manufacturer, symptom, diagnosis_summary, create_work_order, add_to_cadastro }
 */
router.post('/conclude-session', manuiaGuard, apiByUserLimiter, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const {
      equipment_name,
      equipment_manufacturer,
      symptom,
      diagnosis_summary,
      create_work_order = true,
      add_to_cadastro = false,
      sector,
      line_name
    } = req.body || {};

    let woId = null;
    let machineId = null;
    let workOrderTitle = null;

    if (create_work_order) {
      workOrderTitle = `ManuIA: ${equipment_name || 'Equipamento'} - ${symptom || 'Manutenção'}`;
      const description = diagnosis_summary || `Manutenção assistida por IA. Equipamento: ${equipment_name}. Sintoma: ${symptom}`;
      const r = await db.query(
        `INSERT INTO work_orders (company_id, title, description, type, machine_name, line_name, sector, status, created_by)
         VALUES ($1, $2, $3, 'corrective', $4, $5, $6, 'open', $7)
         RETURNING id`,
        [companyId, workOrderTitle.slice(0, 200), description, equipment_name || null, line_name || null, sector || null, userId]
      );
      woId = r.rows?.[0]?.id;
    }

    if (woId && String(process.env.MANUIA_INBOX_FROM_SESSION || '').toLowerCase() === 'true') {
      try {
        const ingest = require('../services/manuiaApp/manuiaInboxIngestService');
        await ingest.notifyUserForWorkOrderCreated({
          companyId,
          userId,
          workOrderId: woId,
          woTitle: workOrderTitle,
          machineName: equipment_name
        });
      } catch (inboxErr) {
        console.warn('[MANUIA_INBOX_FROM_SESSION]', inboxErr?.message);
      }
    }

    if (add_to_cadastro && equipment_name) {
      const code = (equipment_name || '').replace(/\s+/g, '_').slice(0, 50) || 'eq_' + Date.now();
      const ins = await db.query(
        `INSERT INTO manuia_machines (company_id, code, name, sector, line_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
         RETURNING id`,
        [companyId, code, equipment_name, sector || null, line_name || null]
      );
      machineId = ins.rows?.[0]?.id;
    }

    res.json({
      ok: true,
      work_order_id: woId,
      machine_id: machineId
    });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.status(503).json({ ok: false, error: 'Tabelas work_orders ou manuia_machines não existem. Execute as migrations.' });
    }
    console.warn('[MANUIA_CONCLUDE]', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao concluir sessão' });
  }
});

/** Health/ping do módulo */
router.get('/health', manuiaGuard, (req, res) => {
  res.json({ ok: true, module: 'manuia', version: '1.0.0' });
});

/** App de extensão ManuIA (PWA / mobile): preferências, inbox, plantão, decisão de alerta */
router.use('/app', require('./manuiaApp'));

module.exports = router;
