'use strict';

/**
 * Admin — aprendizagem supervisionada (propostas e aprovação explícita).
 * Montado em /api/admin/learning
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireCompanyId } = require('../middleware/auth');
const supervisedLearningService = require('../services/supervisedLearningService');
const adaptiveTuningService = require('../services/adaptiveTuningService');

const jsonBody = express.json({ limit: '256kb' });
const adminOnly = [requireAuth, requireRole('admin'), requireCompanyId];

const strategicLearningService = require('../services/strategicLearningService');

/** GET /strategic/patterns — padrões detectados na memória operacional (só leitura). */
router.get('/strategic/patterns', ...adminOnly, (req, res) => {
  try {
    const patterns = strategicLearningService.analyzeSystemPatterns();
    return res.json({ ok: true, patterns });
  } catch (e) {
    console.error('[ADMIN_LEARNING_STRATEGIC_PATTERNS]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** GET /proposals — lista propostas (memória do processo). */
router.get('/proposals', ...adminOnly, (req, res) => {
  try {
    return res.json({ ok: true, proposals: supervisedLearningService.getProposals() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_PROPOSALS]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/**
 * POST /scan — gera sugestões a partir da memória operacional e regista pendentes.
 */
router.post('/scan', ...adminOnly, jsonBody, (req, res) => {
  try {
    const { createdIds } = supervisedLearningService.scanAndStorePendingProposals();
    return res.json({ ok: true, createdIds });
  } catch (e) {
    console.error('[ADMIN_LEARNING_SCAN]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /approve — aprova proposta e aplica ajustes aprovados (runtime, auditável). */
router.post('/approve', ...adminOnly, jsonBody, (req, res) => {
  try {
    const id = req.body?.id;
    if (id == null) {
      return res.status(400).json({ ok: false, error: 'Informe id da proposta.' });
    }
    const updated = supervisedLearningService.approveProposal(id, { userId: req.user?.id });
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Proposta não encontrada ou já processada.' });
    }
    return res.json({ ok: true, proposal: updated });
  } catch (e) {
    console.error('[ADMIN_LEARNING_APPROVE]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /reject — rejeita proposta pendente (sem aplicar ajuste). */
router.post('/reject', ...adminOnly, jsonBody, (req, res) => {
  try {
    const id = req.body?.id;
    if (id == null) {
      return res.status(400).json({ ok: false, error: 'Informe id da proposta.' });
    }
    const updated = supervisedLearningService.rejectProposal(id, { userId: req.user?.id });
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'Proposta não encontrada ou já processada.' });
    }
    return res.json({ ok: true, proposal: updated });
  } catch (e) {
    console.error('[ADMIN_LEARNING_REJECT]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** POST /adjustments/clear — rollback: remove ajustes supervisionados aplicados em memória. */
router.post('/adjustments/clear', ...adminOnly, jsonBody, (req, res) => {
  try {
    adaptiveTuningService.clearApprovedLearningAdjustments();
    return res.json({ ok: true, adjustments: adaptiveTuningService.getApprovedLearningAdjustments() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_CLEAR]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

/** GET /adjustments — estado actual dos ajustes aplicados (leitura). */
router.get('/adjustments', ...adminOnly, (req, res) => {
  try {
    return res.json({ ok: true, adjustments: adaptiveTuningService.getApprovedLearningAdjustments() });
  } catch (e) {
    console.error('[ADMIN_LEARNING_ADJ_GET]', e);
    return res.status(500).json({ ok: false, error: e.message || 'erro' });
  }
});

module.exports = router;
