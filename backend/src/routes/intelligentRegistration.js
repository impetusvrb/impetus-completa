/**
 * ROTAS - REGISTRO INTELIGENTE
 * Módulo disponível para todos os usuários
 * Aceita: texto, foto, documento ou áudio
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireFactoryOperationalMember } = require('../middleware/auth');
const { apiByUserLimiter } = require('../middleware/globalRateLimit');
const { logAction } = require('../middleware/audit');
const intelligentRegistrationService = require('../services/intelligentRegistrationService');
const attachmentService = require('../services/intelligentRegistrationAttachments');
const claudeAnalytics = require('../services/claudeAnalyticsService');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads/registro-inteligente');
const MAX_FILE_MB = 15;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname || ''))
  }),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    cb(null, attachmentService.ALLOWED_EXT.includes(ext));
  }
});

const protected = [requireAuth];

/**
 * POST /api/intelligent-registration
 * Registrar texto e/ou anexo com processamento por IA
 */
router.post('/', ...protected, requireFactoryOperationalMember, apiByUserLimiter, upload.single('file'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(400).json({ ok: false, error: 'Usuário ou empresa não identificados' });
    }

    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const shiftRaw = req.body?.shift_name;
    const shift_name =
      typeof shiftRaw === 'string' && shiftRaw.trim() ? shiftRaw.trim() : null;

    let finalText = text.trim();
    let attachmentMeta = null;

    if (req.file) {
      const processed = await attachmentService.processUploadedFile(req.file, text, {
        companyId,
        userId,
        userName: req.user?.name
      });
      finalText = processed.text;
      attachmentMeta = processed.meta;
    }

    if (!finalText || finalText.length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Descreva o registro em texto ou envie foto, documento ou áudio.'
      });
    }

    const registration = await intelligentRegistrationService.createRegistration(
      companyId,
      userId,
      finalText,
      shift_name,
      req.user?.active_operational_team_member_id || null,
      attachmentMeta
    );

    if (req.user?.is_factory_team_account && req.user?.active_operational_team_member_id) {
      logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'intelligent_registration_created',
        entityType: 'intelligent_registration',
        entityId: registration?.id,
        description: 'Registro inteligente criado (login coletivo; rastreio por membro da equipe)',
        changes: { operational_team_member_id: req.user.active_operational_team_member_id },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.user.sessionId || null,
        severity: 'info'
      }).catch((err) => {
        console.warn('[routes/intelligentRegistration][log_action]', err?.message ?? err);
      });
    }

    claudeAnalytics.ingestRegistroInteligente(registration, companyId);

    res.status(201).json({ ok: true, data: registration });
  } catch (err) {
    console.error('[INTELLIGENT_REGISTRATION]', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Erro ao processar registro'
    });
  }
});

/**
 * GET /api/intelligent-registration
 * Listar meus registros
 */
router.get('/', ...protected, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(400).json({ ok: false, error: 'Usuário ou empresa não identificados' });
    }

    const { limit, offset, dateFrom, dateTo } = req.query;
    const rows = await intelligentRegistrationService.listMyRegistrations(companyId, userId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null
    });

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[INTELLIGENT_REGISTRATION_LIST]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar registros' });
  }
});

/**
 * GET /api/intelligent-registration/leadership
 * Listar registros para liderança (hierarchy <= 2)
 */
router.get('/leadership', ...protected, async (req, res) => {
  try {
    const level = req.user?.hierarchy_level ?? 5;
    if (level > 2) {
      return res.status(403).json({ ok: false, error: 'Acesso restrito à liderança' });
    }

    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    }

    const { limit, offset, dateFrom, dateTo, userId, priority } = req.query;
    const rows = await intelligentRegistrationService.listForLeadership(companyId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      userId: userId || null,
      priority: priority || null
    });

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[INTELLIGENT_REGISTRATION_LEADERSHIP]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar registros' });
  }
});

module.exports = router;
