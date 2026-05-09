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
const cognitiveReplayService = require('../services/cognitiveReplayService');
const cognitiveDriftService = require('../services/cognitiveDriftService');
const cognitiveDbPersistenceService = require('../services/cognitiveDbPersistenceService');
const aiAnalyticsService = require('../services/aiAnalyticsService');
const cognitiveConsensusService = require('../services/cognitiveConsensusService');
const confidenceCalibrationService = require('../services/confidenceCalibrationService');

/** GET /dashboard — governança cognitiva consolidada (só leitura). */
router.get('/dashboard', ...adminOnly, async (req, res) => {
  try {
    if (!aiAnalyticsService.isGovernanceDashboardEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Painel de governança cognitiva desactivado (IMPETUS_COGNITIVE_DASHBOARD_ENABLED).',
        code: 'DASHBOARD_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const dashboard = await aiAnalyticsService.getCognitiveGovernanceDashboard(companyId);
    return res.json({ ok: true, dashboard });
  } catch (e) {
    try {
      console.warn('[GOVERNANCE_DASHBOARD_ERROR]', { route: 'dashboard', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'governance_dashboard_failed' });
  }
});

/**
 * POST /consensus/analyze — compara outputs de múltiplas IAs (observacional; opcional persistência no event store).
 */
router.post('/consensus/analyze', ...adminOnly, jsonBody, async (req, res) => {
  try {
    if (!cognitiveConsensusService.isConsensusEngineEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Engine de consenso desactivado (IMPETUS_COGNITIVE_CONSENSUS_ENABLED).',
        code: 'CONSENSUS_DISABLED'
      });
    }

    const participants = req.body?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Informe participants (array não vazio).',
        code: 'INVALID_PARTICIPANTS'
      });
    }

    const report = await cognitiveConsensusService.generateConsensusReport({ participants });
    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;

    const payload = {
      report: {
        consensus_score: report.consensus_score,
        divergence_detected: report.divergence_detected,
        confidence: report.confidence,
        narrative: report.narrative,
        participants_summary: report.participants_summary
      },
      participants_redacted: participants.map((p) => ({
        engine: p?.engine != null ? String(p.engine).slice(0, 128) : null,
        confidence: p?.confidence,
        output:
          p?.output != null
            ? String(p.output).slice(0, 12000)
            : ''
      }))
    };

    await cognitiveDbPersistenceService.persistConsensusEventToDb({
      companyId,
      consensus_score: report.consensus_score,
      divergence_detected: report.divergence_detected,
      payload
    });

    return res.json({ ok: true, report });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', { route: 'consensus/analyze', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'consensus_analyze_failed' });
  }
});

/** GET /consensus/events — eventos de consenso recentes (tenant). Query: limit */
router.get('/consensus/events', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveConsensusService.isConsensusEngineEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Engine de consenso desactivado (IMPETUS_COGNITIVE_CONSENSUS_ENABLED).',
        code: 'CONSENSUS_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listConsensusEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', { route: 'consensus/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'consensus_events_failed' });
  }
});

/**
 * POST /calibration/analyze — relatório de calibração (observacional; opcional persistência).
 */
router.post('/calibration/analyze', ...adminOnly, jsonBody, async (req, res) => {
  try {
    if (!confidenceCalibrationService.isConfidenceCalibrationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Calibração de confiança desactivada (IMPETUS_CONFIDENCE_CALIBRATION_ENABLED).',
        code: 'CALIBRATION_DISABLED'
      });
    }

    const { confidence, consensusScore, driftDetected } = req.body || {};
    if (
      confidence == null ||
      consensusScore == null ||
      driftDetected == null ||
      typeof driftDetected !== 'boolean'
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Informe confidence, consensusScore e driftDetected (booleano).',
        code: 'INVALID_CALIBRATION_INPUT'
      });
    }

    const report = await confidenceCalibrationService.generateCalibrationReport({
      confidence: Number(confidence),
      consensusScore: Number(consensusScore),
      driftDetected
    });

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const payload = {
      input: {
        confidence: Number(confidence),
        consensusScore: Number(consensusScore),
        driftDetected
      },
      report
    };

    await cognitiveDbPersistenceService.persistCalibrationEventToDb({
      companyId,
      calibrated_confidence: report.calibrated_confidence,
      overconfidence: report.overconfidence,
      underconfidence: report.underconfidence,
      payload
    });

    return res.json({ ok: true, report });
  } catch (e) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', { route: 'calibration/analyze', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'calibration_analyze_failed' });
  }
});

/** GET /calibration/events — eventos de calibração recentes (tenant). Query: limit */
router.get('/calibration/events', ...adminOnly, async (req, res) => {
  try {
    if (!confidenceCalibrationService.isConfidenceCalibrationEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Calibração de confiança desactivada (IMPETUS_CONFIDENCE_CALIBRATION_ENABLED).',
        code: 'CALIBRATION_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listCalibrationEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', { route: 'calibration/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'calibration_events_failed' });
  }
});

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

/**
 * GET /replay/:id — reconstrução histórica (só leitura, sem IA). Query: compare=1, currentConfidence, currentDataState
 */
router.get('/replay/:id', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Replay cognitivo desactivado (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const replay = await cognitiveReplayService.replayInteraction(req.params.id, companyId);

    if (replay.error === 'REPLAY_DISABLED') {
      return res.status(403).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'INTERACTION_NOT_FOUND') {
      return res.status(404).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'REPLAY_FAILED') {
      return res.status(500).json({ ok: false, error: replay.error, code: replay.error });
    }

    let comparison = null;
    const cmp = String(req.query.compare || '').toLowerCase();
    if (cmp === '1' || cmp === 'true' || cmp === 'yes') {
      comparison = cognitiveReplayService.compareReplayWithCurrent(replay, {
        confidence:
          req.query.currentConfidence != null && req.query.currentConfidence !== ''
            ? Number(req.query.currentConfidence)
            : null,
        data_state:
          req.query.currentDataState != null && String(req.query.currentDataState).length > 0
            ? String(req.query.currentDataState)
            : null
      });
    }

    return res.json({ ok: true, replay, comparison });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { route: 'replay', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'replay_failed' });
  }
});

/**
 * GET /snapshot?date= — contagens cumulativas até à data (ISO), só leitura.
 */
router.get('/snapshot', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Replay cognitivo desactivado (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_DISABLED'
      });
    }

    const date = req.query.date;
    if (date == null || String(date).trim() === '') {
      return res.status(400).json({ ok: false, error: 'Informe date (ISO 8601).' });
    }

    const snapshot = await cognitiveReplayService.getCognitiveSnapshotAt(String(date).trim());
    if (snapshot.error === 'REPLAY_DISABLED' || snapshot.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: snapshot.error, code: snapshot.error });
    }
    if (snapshot.error === 'INVALID_DATE') {
      return res.status(400).json({ ok: false, error: 'INVALID_DATE' });
    }
    if (snapshot.error === true) {
      return res.status(500).json({ ok: false, error: 'snapshot_failed' });
    }

    return res.json({ ok: true, snapshot });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { route: 'snapshot', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'snapshot_failed' });
  }
});

/**
 * GET /drift/report/:interactionId — relatório de drift (baseline = replay; actual = query).
 * Query: currentConfidence, currentDataState, currentNarrative, baselineNarrative (opcional)
 */
router.get('/drift/report/:interactionId', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveDriftService.isDriftDetectionEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Detecção de drift desactivada (IMPETUS_COGNITIVE_DRIFT_ENABLED).',
        code: 'DRIFT_DISABLED'
      });
    }

    if (!cognitiveReplayService.isReplayEnabled()) {
      return res.status(503).json({
        ok: false,
        error: 'Replay cognitivo necessário para baseline (IMPETUS_COGNITIVE_REPLAY_ENABLED).',
        code: 'REPLAY_REQUIRED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const replay = await cognitiveReplayService.replayInteraction(
      req.params.interactionId,
      companyId
    );

    if (replay.error === 'REPLAY_DISABLED') {
      return res.status(403).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'COGNITIVE_DB_DISABLED') {
      return res.status(503).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'INTERACTION_NOT_FOUND') {
      return res.status(404).json({ ok: false, error: replay.error, code: replay.error });
    }
    if (replay.error === 'REPLAY_FAILED') {
      return res.status(500).json({ ok: false, error: replay.error, code: replay.error });
    }

    const current = {
      confidence:
        req.query.currentConfidence != null && req.query.currentConfidence !== ''
          ? Number(req.query.currentConfidence)
          : null,
      data_state:
        req.query.currentDataState != null && String(req.query.currentDataState).trim() !== ''
          ? String(req.query.currentDataState).trim()
          : null,
      currentNarrative:
        req.query.currentNarrative != null ? String(req.query.currentNarrative) : '',
      previousNarrative:
        req.query.baselineNarrative != null ? String(req.query.baselineNarrative) : ''
    };

    const report = await cognitiveDriftService.generateDriftReport({ replay, current });
    cognitiveDriftService.schedulePersistDriftReport(companyId, report, req.params.interactionId);

    return res.json({
      ok: true,
      interactionId: req.params.interactionId,
      report
    });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', { route: 'drift/report', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'drift_report_failed' });
  }
});

/** GET /drift/events — eventos de drift recentes (tenant). Query: limit */
router.get('/drift/events', ...adminOnly, async (req, res) => {
  try {
    if (!cognitiveDriftService.isDriftDetectionEnabled()) {
      return res.status(403).json({
        ok: false,
        error: 'Detecção de drift desactivada (IMPETUS_COGNITIVE_DRIFT_ENABLED).',
        code: 'DRIFT_DISABLED'
      });
    }

    const companyId = req.user?.company_id != null ? String(req.user.company_id) : null;
    const events = await cognitiveDbPersistenceService.listDriftEventsForCompany(
      companyId,
      req.query.limit
    );

    return res.json({ ok: true, events });
  } catch (e) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', { route: 'drift/events', message: e?.message || e });
    } catch (_e) {}
    return res.status(500).json({ ok: false, error: 'drift_events_failed' });
  }
});

module.exports = router;
