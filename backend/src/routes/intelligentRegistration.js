/**
 * ROTAS - REGISTRO INTELIGENTE
 * Módulo disponível para todos os usuários
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const intelligentRegistrationService = require('../services/intelligentRegistrationService');
const claudeAnalytics = require('../services/claudeAnalyticsService');

const protected = [requireAuth];

/**
 * POST /api/intelligent-registration
 * Registrar texto com processamento por IA
 */
router.post('/', ...protected, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    if (!companyId || !userId) {
      return res.status(400).json({ ok: false, error: 'Usuário ou empresa não identificados' });
    }

    const { text, shift_name } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'Texto obrigatório' });
    }

    const registration = await intelligentRegistrationService.createRegistration(
      companyId, userId, text, shift_name
    );

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
